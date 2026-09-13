# -*- coding: utf-8 -*-
"""
Look.ai Advanced Garment Processor
Production-quality garment segmentation, edge cleanup, and alpha matting.
Designed to give IDM-VTON the cleanest possible garment input.
"""

import io
import os
import logging
import asyncio
import hashlib
import time
from typing import Optional, Tuple

from PIL import Image, ImageFilter, ImageOps, ImageStat

logger = logging.getLogger("TryOnX-Engine v2.0")


class GarmentProcessor:
    """Advanced garment segmentation and preprocessing pipeline."""
    
    # Cache preprocessed garments to avoid re-processing
    _garment_cache = {}
    CACHE_MAX = 50
    
    @classmethod
    async def process(cls, garment_bytes: bytes, target_w: int = 768, target_h: int = 1024) -> bytes:
        """
        Full garment processing pipeline:
        1. Background removal (rembg)
        2. Edge cleanup & feathering
        3. Alpha matting refinement
        4. Auto-crop to garment bounding box
        5. Resize to target dimensions
        6. Quality mask validation
        """
        # Check cache
        cache_key = hashlib.md5(garment_bytes[:5000]).hexdigest()
        if cache_key in cls._garment_cache:
            logger.info("[GARMENT] Cache hit — skipping re-processing")
            return cls._garment_cache[cache_key]
        
        start = time.time()
        
        # Step 1: Background removal
        clean_bytes = await cls._remove_background(garment_bytes)
        
        # Step 2: Open as RGBA
        img = Image.open(io.BytesIO(clean_bytes)).convert("RGBA")
        
        # Step 3: Clean edges — remove fringing artifacts
        img = cls._clean_edges(img)
        
        # Step 4: Alpha matting refinement
        img = cls._refine_alpha(img)
        
        # Step 5: Auto-crop to garment bounding box (remove empty space)
        img = cls._auto_crop(img)
        
        # Step 6: Resize to target with aspect ratio preservation
        img = cls._resize_preserve_aspect(img, target_w, target_h)
        
        # Step 7: Validate mask quality
        mask_quality = cls._validate_mask(img)
        if mask_quality < 0.1:
            logger.warning(f"[GARMENT] Poor mask quality ({mask_quality:.2f}) — using original with simple resize")
            img = Image.open(io.BytesIO(garment_bytes)).convert("RGBA")
            img = img.resize((target_w, target_h), Image.LANCZOS)
        
        # Save result
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        result = buf.getvalue()
        
        # Cache it
        cls._garment_cache[cache_key] = result
        if len(cls._garment_cache) > cls.CACHE_MAX:
            oldest = next(iter(cls._garment_cache))
            del cls._garment_cache[oldest]
        
        elapsed = time.time() - start
        logger.info(f"[GARMENT] Processed in {elapsed:.2f}s | Mask quality: {mask_quality:.2f} | "
                     f"{len(garment_bytes)//1024}KB → {len(result)//1024}KB")
        return result
    
    @staticmethod
    async def _remove_background(img_bytes: bytes) -> bytes:
        """Remove background using rembg with optimized settings."""
        try:
            from rembg import remove, new_session
            # Use u2net_cloth_seg model if available (specialized for clothing)
            try:
                session = new_session("u2net_cloth_seg")
                result = remove(img_bytes, session=session, alpha_matting=True,
                                alpha_matting_foreground_threshold=240,
                                alpha_matting_background_threshold=10)
                logger.info("[GARMENT] Background removed with u2net_cloth_seg")
                return result
            except Exception:
                pass
            
            # Fallback to default model
            result = remove(img_bytes, alpha_matting=True,
                            alpha_matting_foreground_threshold=240,
                            alpha_matting_background_threshold=10)
            logger.info("[GARMENT] Background removed with default model")
            return result
        except ImportError:
            logger.info("[GARMENT] rembg not available — returning original")
            return img_bytes
        except Exception as e:
            logger.warning(f"[GARMENT] Background removal error: {e}")
            return img_bytes
    
    @staticmethod
    def _clean_edges(img: Image.Image) -> Image.Image:
        """Remove edge fringing and artifacts from transparent garment."""
        if img.mode != "RGBA":
            return img
        
        r, g, b, a = img.split()
        
        # Erode alpha slightly to remove edge fringing
        # Convert alpha to grayscale image for filtering
        a_filtered = a.filter(ImageFilter.MinFilter(3))
        
        # Smooth the alpha edge
        a_smooth = a_filtered.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Threshold to clean up semi-transparent edges
        a_clean = a_smooth.point(lambda x: 255 if x > 128 else 0)
        
        # Apply feathering on the edge (1px gaussian blur on the mask)
        a_feathered = a_clean.filter(ImageFilter.GaussianBlur(radius=0.8))
        
        return Image.merge("RGBA", (r, g, b, a_feathered))
    
    @staticmethod
    def _refine_alpha(img: Image.Image) -> Image.Image:
        """Refine alpha channel — remove semi-transparent noise pixels."""
        if img.mode != "RGBA":
            return img
        
        r, g, b, a = img.split()
        
        # Remove noise: pixels with very low alpha are fully transparent
        a_refined = a.point(lambda x: 0 if x < 30 else (255 if x > 225 else x))
        
        return Image.merge("RGBA", (r, g, b, a_refined))
    
    @staticmethod
    def _auto_crop(img: Image.Image) -> Image.Image:
        """Crop to the garment bounding box, removing empty transparent space."""
        if img.mode != "RGBA":
            return img
        
        # Get alpha channel bounding box
        alpha = img.split()[3]
        bbox = alpha.getbbox()
        
        if bbox:
            # Add small padding (2% of dimensions)
            w, h = img.size
            pad_x = int(w * 0.02)
            pad_y = int(h * 0.02)
            bbox = (
                max(0, bbox[0] - pad_x),
                max(0, bbox[1] - pad_y),
                min(w, bbox[2] + pad_x),
                min(h, bbox[3] + pad_y)
            )
            return img.crop(bbox)
        return img
    
    @staticmethod
    def _resize_preserve_aspect(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
        """Resize while preserving aspect ratio, centered on transparent background."""
        w, h = img.size
        ratio = min(target_w / w, target_h / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        
        # Center on target-sized transparent canvas
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        offset_x = (target_w - new_w) // 2
        offset_y = (target_h - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        
        return canvas
    
    @staticmethod
    def _validate_mask(img: Image.Image) -> float:
        """
        Validate garment mask quality (0.0 to 1.0).
        Checks: sufficient opaque area, not too much transparency, good coverage.
        """
        if img.mode != "RGBA":
            return 0.5
        
        alpha = img.split()[3]
        total_pixels = alpha.size[0] * alpha.size[1]
        
        if total_pixels == 0:
            return 0.0
        
        # Count opaque, semi-transparent, and transparent pixels
        histogram = alpha.histogram()
        transparent = sum(histogram[:30])       # alpha < 30
        semi_transparent = sum(histogram[30:225])  # 30 <= alpha < 225
        opaque = sum(histogram[225:])           # alpha >= 225
        
        opaque_ratio = opaque / total_pixels
        
        # Good garment mask: 15-85% opaque (garment shouldn't fill entire frame)
        if opaque_ratio < 0.05:
            return 0.05  # Almost nothing — bad mask
        elif opaque_ratio > 0.95:
            return 0.3   # Almost everything opaque — background not removed
        elif 0.15 <= opaque_ratio <= 0.85:
            return 1.0   # Good coverage
        else:
            return 0.6   # Acceptable
    
    @classmethod
    def get_cache_stats(cls) -> dict:
        return {"cached_garments": len(cls._garment_cache), "max_cache": cls.CACHE_MAX}
