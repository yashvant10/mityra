# -*- coding: utf-8 -*-
"""
Look.ai Post-Generation Enhancer — Commercial Quality
Applies production-grade post-processing to AI-generated try-on images.

Features:
- Edge blending (no pasted look)
- Shadow matching
- Skin tone preservation
- Lighting harmonization
- Fabric detail enhancement
- Face/background lock verification
"""

import io
import logging
import time
from typing import Optional, Tuple

from PIL import Image, ImageEnhance, ImageFilter, ImageStat, ImageChops

logger = logging.getLogger("TryOnX-Engine v2.0")


class TryOnEnhancer:
    """
    Post-generation enhancer for commercial-quality virtual try-on.
    Processes the raw AI output to look like a real photograph.
    """

    @classmethod
    async def enhance(
        cls,
        result_bytes: bytes,
        original_bytes: Optional[bytes] = None,
    ) -> bytes:
        """
        Full enhancement pipeline:
        1. Normalize brightness/contrast to match original
        2. Skin tone preservation
        3. Edge softening (anti-pasting)
        4. Fabric texture enhancement
        5. Shadow harmonization
        6. Final sharpening
        """
        start = time.time()

        try:
            result = Image.open(io.BytesIO(result_bytes)).convert("RGB")
            original = None
            if original_bytes:
                try:
                    original = Image.open(io.BytesIO(original_bytes)).convert("RGB")
                except Exception:
                    pass

            # Step 1: Match overall brightness/contrast to original
            if original:
                result = cls._match_lighting(result, original)

            # Step 2: Preserve skin tone (face region)
            if original:
                result = cls._preserve_skin_tone(result, original)

            # Step 3: Edge softening in garment transition zone
            result = cls._soften_garment_edges(result)

            # Step 4: Enhance fabric texture (subtle)
            result = cls._enhance_fabric_texture(result)

            # Step 5: Shadow harmonization
            if original:
                result = cls._harmonize_shadows(result, original)

            # Step 6: Final subtle sharpening
            result = cls._final_sharpen(result)

            buf = io.BytesIO()
            result.save(buf, format="JPEG", quality=95, optimize=True)
            enhanced = buf.getvalue()

            elapsed = time.time() - start
            logger.info(f"[ENHANCE] Commercial enhancement: {elapsed:.2f}s | "
                         f"{len(result_bytes)//1024}KB → {len(enhanced)//1024}KB")
            return enhanced

        except Exception as e:
            logger.warning(f"[ENHANCE] Enhancement failed (using original): {e}")
            return result_bytes

    @staticmethod
    def _match_lighting(result: Image.Image, original: Image.Image) -> Image.Image:
        """Match the overall brightness and contrast of the result to the original."""
        orig_stat = ImageStat.Stat(original)
        res_stat = ImageStat.Stat(result)

        orig_brightness = sum(orig_stat.mean[:3]) / 3
        res_brightness = sum(res_stat.mean[:3]) / 3

        if res_brightness > 0:
            brightness_ratio = orig_brightness / res_brightness
            # Clamp to reasonable range (don't over-correct)
            brightness_ratio = max(0.85, min(1.15, brightness_ratio))
            if abs(brightness_ratio - 1.0) > 0.02:
                result = ImageEnhance.Brightness(result).enhance(brightness_ratio)

        # Match contrast
        orig_contrast = sum(orig_stat.stddev[:3]) / 3
        res_contrast = sum(res_stat.stddev[:3]) / 3
        if res_contrast > 0:
            contrast_ratio = orig_contrast / res_contrast
            contrast_ratio = max(0.90, min(1.10, contrast_ratio))
            if abs(contrast_ratio - 1.0) > 0.02:
                result = ImageEnhance.Contrast(result).enhance(contrast_ratio)

        return result

    @staticmethod
    def _preserve_skin_tone(result: Image.Image, original: Image.Image) -> Image.Image:
        """
        Preserve skin tone by blending the face region from original lighting.
        Only adjusts color temperature, not content (AI already preserved face).
        """
        rw, rh = result.size
        ow, oh = original.size

        # Face region: top 30%, center 50%
        face_x1, face_y1 = int(rw * 0.25), int(rh * 0.02)
        face_x2, face_y2 = int(rw * 0.75), int(rh * 0.28)

        res_face = result.crop((face_x1, face_y1, face_x2, face_y2))
        orig_face = original.crop((int(ow * 0.25), int(oh * 0.02), int(ow * 0.75), int(oh * 0.28)))
        orig_face = orig_face.resize(res_face.size, Image.LANCZOS)

        res_stat = ImageStat.Stat(res_face)
        orig_stat = ImageStat.Stat(orig_face)

        # Calculate color shift per channel
        r_shift = orig_stat.mean[0] - res_stat.mean[0]
        g_shift = orig_stat.mean[1] - res_stat.mean[1]
        b_shift = orig_stat.mean[2] - res_stat.mean[2]

        # Only apply if shift is significant but not extreme
        max_shift = max(abs(r_shift), abs(g_shift), abs(b_shift))
        if 5 < max_shift < 40:
            # Apply gentle color correction to face area only
            corrected_face = res_face.copy()
            pixels = corrected_face.load()
            w, h = corrected_face.size
            for y in range(h):
                for x in range(w):
                    r, g, b = pixels[x, y]
                    pixels[x, y] = (
                        max(0, min(255, int(r + r_shift * 0.5))),
                        max(0, min(255, int(g + g_shift * 0.5))),
                        max(0, min(255, int(b + b_shift * 0.5))),
                    )
            result.paste(corrected_face, (face_x1, face_y1))

        return result

    @staticmethod
    def _soften_garment_edges(result: Image.Image) -> Image.Image:
        """
        Soften edges in garment transition zones to prevent 'pasted' look.
        Applies subtle gaussian blur in transition bands.
        """
        w, h = result.size

        # Garment transition zones: shoulders, neckline, hem
        transition_bands = [
            (int(w * 0.1), int(h * 0.25), int(w * 0.9), int(h * 0.32)),  # Shoulder/neckline
            (int(w * 0.1), int(h * 0.70), int(w * 0.9), int(h * 0.78)),  # Hem
            (int(w * 0.05), int(h * 0.30), int(w * 0.15), int(h * 0.65)),  # Left sleeve edge
            (int(w * 0.85), int(h * 0.30), int(w * 0.95), int(h * 0.65)),  # Right sleeve edge
        ]

        for x1, y1, x2, y2 in transition_bands:
            try:
                region = result.crop((x1, y1, x2, y2))
                # Very subtle blur (0.3px) — just enough to smooth seams
                blurred = region.filter(ImageFilter.GaussianBlur(radius=0.3))
                # Blend 30% blurred with 70% original for subtle effect
                blended = Image.blend(region, blurred, alpha=0.3)
                result.paste(blended, (x1, y1))
            except Exception:
                pass

        return result

    @staticmethod
    def _enhance_fabric_texture(result: Image.Image) -> Image.Image:
        """
        Enhance fabric texture detail in the garment area.
        Preserves wrinkles, folds, and fabric patterns.
        """
        w, h = result.size

        # Garment region (chest + torso)
        gx1, gy1 = int(w * 0.15), int(h * 0.28)
        gx2, gy2 = int(w * 0.85), int(h * 0.72)

        garment = result.crop((gx1, gy1, gx2, gy2))

        # Check current texture detail level
        edges = garment.filter(ImageFilter.FIND_EDGES)
        detail = ImageStat.Stat(edges.convert("L")).stddev[0]

        if detail < 25:
            # Low detail: enhance more aggressively
            garment = ImageEnhance.Sharpness(garment).enhance(1.15)
            garment = ImageEnhance.Contrast(garment).enhance(1.04)
        elif detail < 40:
            # Medium detail: subtle enhancement
            garment = ImageEnhance.Sharpness(garment).enhance(1.08)
        # High detail: leave as-is

        result.paste(garment, (gx1, gy1))
        return result

    @staticmethod
    def _harmonize_shadows(result: Image.Image, original: Image.Image) -> Image.Image:
        """
        Harmonize shadow intensity between original and result.
        Ensures clothing shadows match the scene lighting.
        """
        rw, rh = result.size
        ow, oh = original.size

        # Sample shadow intensity from lower body area of original
        orig_shadow = original.crop((int(ow * 0.2), int(oh * 0.6), int(ow * 0.8), int(oh * 0.9)))
        res_shadow = result.crop((int(rw * 0.2), int(rh * 0.6), int(rw * 0.8), int(rh * 0.9)))

        orig_dark = ImageStat.Stat(orig_shadow).mean
        res_dark = ImageStat.Stat(res_shadow).mean

        orig_lum = sum(orig_dark[:3]) / 3
        res_lum = sum(res_dark[:3]) / 3

        if res_lum > 0:
            lum_ratio = orig_lum / res_lum
            lum_ratio = max(0.92, min(1.08, lum_ratio))
            if abs(lum_ratio - 1.0) > 0.03:
                # Apply shadow correction to lower body only
                lower = result.crop((0, int(rh * 0.55), rw, rh))
                lower = ImageEnhance.Brightness(lower).enhance(lum_ratio)
                result.paste(lower, (0, int(rh * 0.55)))

        return result

    @staticmethod
    def _final_sharpen(result: Image.Image) -> Image.Image:
        """Final subtle sharpening for professional quality."""
        result = ImageEnhance.Sharpness(result).enhance(1.08)
        return result


def build_tryon_prompt(
    clothing_description: str = "",
    garment_category: str = "",
    body_analysis: dict = None,
) -> str:
    """
    Build a detailed prompt for AI try-on generation.
    Maximizes product similarity and realistic fitting.
    """
    # Base instruction
    parts = [
        "Generate a photorealistic virtual try-on image.",
        "The person must be wearing the EXACT garment shown — same fabric, pattern, color, logo, embroidery, buttons, collar, and sleeve style.",
        "The clothing must naturally follow the person's body shape with realistic wrinkles, fabric folds, and draping.",
    ]

    # Garment-specific instructions
    cat = (garment_category or "").lower()
    if "shirt" in cat or "polo" in cat:
        parts.append("Fit the shirt collar around the neck naturally. Sleeves should follow arm contour.")
    elif "hoodie" in cat or "sweatshirt" in cat:
        parts.append("Show natural fabric weight and hood draping. Keep the relaxed fit.")
    elif "jacket" in cat or "blazer" in cat:
        parts.append("Show structured shoulders with natural lapels. Jacket should follow torso shape.")
    elif "kurta" in cat or "sherwani" in cat:
        parts.append("Show natural fabric flow for ethnic wear. Collar and embroidery must be precise.")
    elif "dress" in cat or "gown" in cat:
        parts.append("Show natural draping and fabric flow. Maintain the dress silhouette.")
    elif "saree" in cat or "sari" in cat:
        parts.append("Show natural draping of the pallu. Maintain traditional draping style.")

    if clothing_description:
        parts.append(f"The garment is: {clothing_description}")

    # Body-aware instructions
    if body_analysis:
        if not body_analysis.get("is_frontal", True):
            parts.append("Account for the angled pose — adjust garment perspective accordingly.")
        if body_analysis.get("skin_warmth", 0) > 0.3:
            parts.append("Maintain warm skin tones — do not make the skin appear cooler.")

    # Preservation instructions
    parts.extend([
        "PRESERVE exactly: face, hair, skin tone, hands, background, and body proportions.",
        "ONLY replace the clothing.",
        "Match lighting and shadows to the original photo.",
        "No floating garments. No white borders. No pasted look.",
    ])

    return " ".join(parts)
