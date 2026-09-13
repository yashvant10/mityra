# -*- coding: utf-8 -*-
"""
Look.ai Body Analyzer
Lightweight body analysis for quality validation and pose-aware fitting.
Uses PIL-based heuristics for fast, dependency-free body analysis.
Provides structured metadata to the AI engine and quality validator.
"""

import io
import logging
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from PIL import Image, ImageFilter, ImageStat

logger = logging.getLogger("TryOnX-Engine v2.0")


@dataclass
class BodyAnalysis:
    """Structured body analysis result."""
    # Detected regions (normalized 0-1 coordinates)
    face_region: Optional[Tuple[float, float, float, float]] = None   # (x1, y1, x2, y2)
    torso_region: Optional[Tuple[float, float, float, float]] = None
    
    # Image properties
    width: int = 0
    height: int = 0
    aspect_ratio: float = 0.0
    
    # Skin tone analysis
    avg_skin_brightness: float = 128.0
    skin_warmth: float = 0.0  # positive = warm, negative = cool
    
    # Pose heuristics
    is_frontal: bool = True
    is_centered: bool = True
    
    # Quality flags
    has_face: bool = True
    has_good_lighting: bool = True
    is_suitable: bool = True
    issues: List[str] = field(default_factory=list)
    
    # Processing time
    analysis_time: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "face_region": self.face_region,
            "torso_region": self.torso_region,
            "dimensions": f"{self.width}x{self.height}",
            "aspect_ratio": round(self.aspect_ratio, 2),
            "skin_brightness": round(self.avg_skin_brightness, 1),
            "skin_warmth": round(self.skin_warmth, 2),
            "is_frontal": self.is_frontal,
            "is_centered": self.is_centered,
            "has_face": self.has_face,
            "has_good_lighting": self.has_good_lighting,
            "is_suitable": self.is_suitable,
            "issues": self.issues,
            "analysis_time_ms": round(self.analysis_time * 1000, 1),
        }


class BodyAnalyzer:
    """
    Lightweight body analyzer using PIL heuristics.
    Provides body region detection, skin tone analysis, and pose estimation
    without requiring heavy ML frameworks.
    """
    
    @classmethod
    async def analyze(cls, img_bytes: bytes) -> BodyAnalysis:
        """Run full body analysis on user photo."""
        start = time.time()
        result = BodyAnalysis()
        
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            w, h = img.size
            result.width = w
            result.height = h
            result.aspect_ratio = w / max(h, 1)
            
            # Estimate face region (top 30% center region)
            result.face_region = cls._estimate_face_region(img)
            result.has_face = result.face_region is not None
            
            # Estimate torso region (middle 40-75% of height)
            result.torso_region = (0.15, 0.30, 0.85, 0.75)
            
            # Skin tone analysis
            result.avg_skin_brightness, result.skin_warmth = cls._analyze_skin_tone(img)
            
            # Lighting analysis
            result.has_good_lighting = cls._check_lighting(img)
            
            # Centering analysis
            result.is_centered = cls._check_centered(img)
            
            # Frontal pose heuristic
            result.is_frontal = cls._check_frontal(img)
            
            # Overall suitability
            if not result.has_face:
                result.issues.append("No face detected in upper region")
            if not result.has_good_lighting:
                result.issues.append("Poor lighting — image too dark or too bright")
            if not result.is_centered:
                result.issues.append("Subject not centered")
            if result.aspect_ratio > 1.5:
                result.issues.append("Image is landscape — portrait recommended")
                
            result.is_suitable = len(result.issues) <= 1
            
        except Exception as e:
            result.issues.append(f"Analysis error: {str(e)}")
            result.is_suitable = True  # Don't block on error
        
        result.analysis_time = time.time() - start
        logger.info(f"[BODY] Analysis: {result.width}x{result.height} | "
                     f"Face: {'✓' if result.has_face else '✗'} | "
                     f"Lighting: {'✓' if result.has_good_lighting else '✗'} | "
                     f"{result.analysis_time*1000:.0f}ms")
        return result
    
    @staticmethod
    def _estimate_face_region(img: Image.Image) -> Optional[Tuple[float, float, float, float]]:
        """
        Estimate face region using skin-tone detection in upper portion.
        Returns normalized (x1, y1, x2, y2) or None.
        """
        w, h = img.size
        
        # Check top 40% of image for face-like skin tones
        top_region = img.crop((int(w * 0.2), 0, int(w * 0.8), int(h * 0.4)))
        top_stat = ImageStat.Stat(top_region)
        r, g, b = top_stat.mean[:3]
        
        # Skin tone heuristic: R > G > B, with R in reasonable range
        is_skin_like = (
            r > 60 and r < 250 and    # Not too dark or saturated
            r > g and g > b and        # Typical skin: R > G > B
            (r - b) > 15 and           # Enough warm component
            (r - g) < 80               # Not too red
        )
        
        if is_skin_like:
            # Estimate face bounding box
            return (0.25, 0.02, 0.75, 0.35)
        
        # Alternative: check if there's detail/edges in the face area (face has lots of detail)
        face_area = img.crop((int(w * 0.25), int(h * 0.02), int(w * 0.75), int(h * 0.35)))
        edges = face_area.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges.convert("L"))
        
        if edge_stat.stddev[0] > 25:  # Significant detail = likely a face
            return (0.25, 0.02, 0.75, 0.35)
        
        return None
    
    @staticmethod
    def _analyze_skin_tone(img: Image.Image) -> Tuple[float, float]:
        """Analyze skin tone brightness and warmth from face region."""
        w, h = img.size
        face_area = img.crop((int(w * 0.3), int(h * 0.05), int(w * 0.7), int(h * 0.3)))
        stat = ImageStat.Stat(face_area)
        r, g, b = stat.mean[:3]
        
        brightness = (r + g + b) / 3
        warmth = (r - b) / max(brightness, 1)  # positive = warm skin
        
        return brightness, warmth
    
    @staticmethod
    def _check_lighting(img: Image.Image) -> bool:
        """Check if lighting is adequate (not too dark/bright, good contrast)."""
        stat = ImageStat.Stat(img)
        brightness = sum(stat.mean[:3]) / 3
        contrast = sum(stat.stddev[:3]) / 3
        
        if brightness < 30 or brightness > 240:
            return False
        if contrast < 15:  # Very flat/low contrast
            return False
        return True
    
    @staticmethod
    def _check_centered(img: Image.Image) -> bool:
        """Check if the subject is roughly centered using edge density."""
        w, h = img.size
        
        left_strip = img.crop((0, 0, int(w * 0.15), h))
        right_strip = img.crop((int(w * 0.85), 0, w, h))
        center_strip = img.crop((int(w * 0.3), 0, int(w * 0.7), h))
        
        left_detail = ImageStat.Stat(left_strip.filter(ImageFilter.FIND_EDGES).convert("L")).mean[0]
        right_detail = ImageStat.Stat(right_strip.filter(ImageFilter.FIND_EDGES).convert("L")).mean[0]
        center_detail = ImageStat.Stat(center_strip.filter(ImageFilter.FIND_EDGES).convert("L")).mean[0]
        
        # Subject is centered if center has more detail than edges
        return center_detail > max(left_detail, right_detail) * 0.8
    
    @staticmethod
    def _check_frontal(img: Image.Image) -> bool:
        """Heuristic: check if pose is roughly frontal by symmetry analysis."""
        w, h = img.size
        
        left_half = img.crop((0, 0, w // 2, h))
        right_half = img.crop((w // 2, 0, w, h)).transpose(Image.FLIP_LEFT_RIGHT)
        
        left_stat = ImageStat.Stat(left_half)
        right_stat = ImageStat.Stat(right_half)
        
        # Compare mean colors of left vs mirrored right
        diffs = [abs(l - r) for l, r in zip(left_stat.mean[:3], right_stat.mean[:3])]
        avg_diff = sum(diffs) / 3
        
        return avg_diff < 25  # Symmetric = likely frontal


@dataclass
class QualityScore:
    """Detailed quality scoring for try-on results."""
    # Individual scores (0-100)
    shoulder_alignment: float = 80.0
    body_fitting: float = 80.0
    face_preservation: float = 80.0
    background_preservation: float = 80.0
    lighting_consistency: float = 80.0
    fabric_realism: float = 80.0
    texture_quality: float = 80.0
    edge_blending: float = 80.0
    color_accuracy: float = 80.0
    overall: float = 80.0
    
    is_acceptable: bool = True
    issues: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "shoulder_alignment": round(self.shoulder_alignment, 1),
            "body_fitting": round(self.body_fitting, 1),
            "face_preservation": round(self.face_preservation, 1),
            "background_preservation": round(self.background_preservation, 1),
            "lighting_consistency": round(self.lighting_consistency, 1),
            "fabric_realism": round(self.fabric_realism, 1),
            "texture_quality": round(self.texture_quality, 1),
            "edge_blending": round(self.edge_blending, 1),
            "color_accuracy": round(self.color_accuracy, 1),
            "overall": round(self.overall, 1),
            "is_acceptable": self.is_acceptable,
            "issues": self.issues,
        }


class AdvancedQualityValidator:
    """
    Production-grade quality validator.
    Evaluates 9 criteria and produces a 0-100 overall score.
    """
    
    ACCEPT_THRESHOLD = 50.0
    
    @classmethod
    async def validate(
        cls,
        result_bytes: bytes,
        original_bytes: Optional[bytes] = None,
        original_analysis: Optional[BodyAnalysis] = None,
    ) -> QualityScore:
        """Run comprehensive quality validation."""
        score = QualityScore()
        
        try:
            result_img = Image.open(io.BytesIO(result_bytes)).convert("RGB")
            rw, rh = result_img.size
            result_stat = ImageStat.Stat(result_img)
            
            # 1. Dimensions
            if rw < 100 or rh < 100:
                score.overall = 0.0
                score.is_acceptable = False
                score.issues.append(f"Image too small: {rw}x{rh}")
                return score
            
            orig_img = None
            orig_stat = None
            if original_bytes:
                try:
                    orig_img = Image.open(io.BytesIO(original_bytes)).convert("RGB")
                    orig_stat = ImageStat.Stat(orig_img)
                except Exception:
                    pass
            
            # 2. Face Preservation
            score.face_preservation = cls._score_face_preservation(result_img, orig_img, original_analysis)
            
            # 3. Body Fitting (symmetry and proportions)
            score.body_fitting = cls._score_body_fitting(result_img)
            
            # 4. Shoulder Alignment (symmetry in upper torso)
            score.shoulder_alignment = cls._score_shoulder_alignment(result_img)
            
            # 5. Background Preservation
            score.background_preservation = cls._score_background(result_img, orig_img)
            
            # 6. Lighting Consistency
            score.lighting_consistency = cls._score_lighting(result_img, orig_img)
            
            # 7. Fabric Realism (texture detail in garment area)
            score.fabric_realism = cls._score_fabric_realism(result_img)
            
            # 8. Texture Quality (sharpness / no blur)
            score.texture_quality = cls._score_texture(result_img)
            
            # 9. Edge Blending (no harsh seams)
            score.edge_blending = cls._score_edge_blending(result_img)
            
            # 10. Color Accuracy
            score.color_accuracy = cls._score_color_accuracy(result_stat, orig_stat)
            
            # Overall weighted average
            weights = {
                "face_preservation": 0.20,
                "body_fitting": 0.15,
                "shoulder_alignment": 0.10,
                "background_preservation": 0.10,
                "lighting_consistency": 0.10,
                "fabric_realism": 0.10,
                "texture_quality": 0.10,
                "edge_blending": 0.08,
                "color_accuracy": 0.07,
            }
            
            weighted_sum = (
                score.face_preservation * weights["face_preservation"] +
                score.body_fitting * weights["body_fitting"] +
                score.shoulder_alignment * weights["shoulder_alignment"] +
                score.background_preservation * weights["background_preservation"] +
                score.lighting_consistency * weights["lighting_consistency"] +
                score.fabric_realism * weights["fabric_realism"] +
                score.texture_quality * weights["texture_quality"] +
                score.edge_blending * weights["edge_blending"] +
                score.color_accuracy * weights["color_accuracy"]
            )
            
            score.overall = weighted_sum
            score.is_acceptable = score.overall >= cls.ACCEPT_THRESHOLD
            
            # Flag specific issues
            if score.face_preservation < 40:
                score.issues.append("Face may be distorted")
            if score.fabric_realism < 40:
                score.issues.append("Low fabric detail")
            if score.texture_quality < 40:
                score.issues.append("Image appears blurry")
            if score.lighting_consistency < 40:
                score.issues.append("Lighting mismatch")
            if score.edge_blending < 40:
                score.issues.append("Visible seams/edges")
                
        except Exception as e:
            score.overall = 60.0
            score.is_acceptable = True
            score.issues.append(f"Validation error: {e}")
        
        return score
    
    @staticmethod
    def _score_face_preservation(result: Image.Image, original: Optional[Image.Image], analysis: Optional[BodyAnalysis]) -> float:
        """Compare face region between original and result."""
        w, h = result.size
        
        # Extract face region from result
        face_region = result.crop((int(w * 0.25), int(h * 0.02), int(w * 0.75), int(h * 0.30)))
        face_stat = ImageStat.Stat(face_region)
        face_edges = face_region.filter(ImageFilter.FIND_EDGES)
        face_detail = ImageStat.Stat(face_edges.convert("L")).stddev[0]
        
        # Face should have detail (not blank/distorted)
        if face_detail < 10:
            return 30.0
        
        if original:
            ow, oh = original.size
            orig_face = original.crop((int(ow * 0.25), int(oh * 0.02), int(ow * 0.75), int(oh * 0.30)))
            orig_face_stat = ImageStat.Stat(orig_face)
            
            # Compare skin tones
            brightness_diff = abs(sum(face_stat.mean[:3]) / 3 - sum(orig_face_stat.mean[:3]) / 3)
            if brightness_diff > 50:
                return 40.0
            elif brightness_diff > 25:
                return 70.0
        
        return 90.0
    
    @staticmethod
    def _score_body_fitting(result: Image.Image) -> float:
        """Score body proportions and symmetry."""
        w, h = result.size
        
        # Check symmetry in torso region
        torso = result.crop((0, int(h * 0.25), w, int(h * 0.75)))
        left = torso.crop((0, 0, torso.width // 2, torso.height))
        right = torso.crop((torso.width // 2, 0, torso.width, torso.height)).transpose(Image.FLIP_LEFT_RIGHT)
        
        left_stat = ImageStat.Stat(left)
        right_stat = ImageStat.Stat(right)
        
        diffs = [abs(l - r) for l, r in zip(left_stat.mean[:3], right_stat.mean[:3])]
        avg_diff = sum(diffs) / 3
        
        if avg_diff < 10:
            return 95.0
        elif avg_diff < 20:
            return 85.0
        elif avg_diff < 35:
            return 70.0
        else:
            return 55.0
    
    @staticmethod
    def _score_shoulder_alignment(result: Image.Image) -> float:
        """Score shoulder alignment via edge analysis in shoulder region."""
        w, h = result.size
        shoulder_region = result.crop((int(w * 0.1), int(h * 0.15), int(w * 0.9), int(h * 0.35)))
        
        left_shoulder = shoulder_region.crop((0, 0, shoulder_region.width // 2, shoulder_region.height))
        right_shoulder = shoulder_region.crop((shoulder_region.width // 2, 0, shoulder_region.width, shoulder_region.height))
        
        left_edges = ImageStat.Stat(left_shoulder.filter(ImageFilter.FIND_EDGES).convert("L"))
        right_edges = ImageStat.Stat(right_shoulder.filter(ImageFilter.FIND_EDGES).convert("L"))
        
        edge_diff = abs(left_edges.mean[0] - right_edges.mean[0])
        
        if edge_diff < 5:
            return 95.0
        elif edge_diff < 15:
            return 80.0
        elif edge_diff < 30:
            return 65.0
        else:
            return 50.0
    
    @staticmethod
    def _score_background(result: Image.Image, original: Optional[Image.Image]) -> float:
        """Score background preservation."""
        if not original:
            return 80.0
        
        w, h = result.size
        ow, oh = original.size
        
        # Compare corners (background areas)
        corners = [(0, 0, 0.1, 0.1), (0.9, 0, 1.0, 0.1), (0, 0.9, 0.1, 1.0), (0.9, 0.9, 1.0, 1.0)]
        total_diff = 0
        
        for x1, y1, x2, y2 in corners:
            try:
                r_corner = result.crop((int(w * x1), int(h * y1), int(w * x2), int(h * y2)))
                o_corner = original.crop((int(ow * x1), int(oh * y1), int(ow * x2), int(oh * y2)))
                o_corner = o_corner.resize(r_corner.size)
                
                r_stat = ImageStat.Stat(r_corner)
                o_stat = ImageStat.Stat(o_corner)
                
                diff = sum(abs(r - o) for r, o in zip(r_stat.mean[:3], o_stat.mean[:3])) / 3
                total_diff += diff
            except Exception:
                pass
        
        avg_diff = total_diff / max(len(corners), 1)
        
        if avg_diff < 10:
            return 95.0
        elif avg_diff < 25:
            return 80.0
        elif avg_diff < 50:
            return 60.0
        else:
            return 40.0
    
    @staticmethod
    def _score_lighting(result: Image.Image, original: Optional[Image.Image]) -> float:
        """Score lighting consistency."""
        r_stat = ImageStat.Stat(result)
        r_brightness = sum(r_stat.mean[:3]) / 3
        
        if original:
            o_stat = ImageStat.Stat(original)
            o_brightness = sum(o_stat.mean[:3]) / 3
            diff = abs(r_brightness - o_brightness)
            
            if diff < 15:
                return 95.0
            elif diff < 30:
                return 80.0
            elif diff < 50:
                return 60.0
            else:
                return 40.0
        
        # Without original, just check for extreme values
        if 40 < r_brightness < 220:
            return 85.0
        return 60.0
    
    @staticmethod
    def _score_fabric_realism(result: Image.Image) -> float:
        """Score fabric texture detail in the garment region."""
        w, h = result.size
        garment_area = result.crop((int(w * 0.15), int(h * 0.30), int(w * 0.85), int(h * 0.70)))
        
        edges = garment_area.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges.convert("L"))
        detail = edge_stat.stddev[0]
        
        if detail > 30:
            return 95.0
        elif detail > 20:
            return 85.0
        elif detail > 10:
            return 70.0
        else:
            return 45.0
    
    @staticmethod
    def _score_texture(result: Image.Image) -> float:
        """Score overall texture sharpness."""
        edges = result.filter(ImageFilter.FIND_EDGES)
        stat = ImageStat.Stat(edges.convert("L"))
        variance = stat.stddev[0] ** 2
        
        if variance > 400:
            return 95.0
        elif variance > 200:
            return 85.0
        elif variance > 100:
            return 70.0
        elif variance > 50:
            return 55.0
        else:
            return 35.0
    
    @staticmethod
    def _score_edge_blending(result: Image.Image) -> float:
        """Score edge blending quality — look for harsh seams in the garment area."""
        w, h = result.size
        # Check horizontal bands across the garment area for sudden edge jumps
        garment_top = result.crop((int(w * 0.2), int(h * 0.28), int(w * 0.8), int(h * 0.33)))
        garment_bottom = result.crop((int(w * 0.2), int(h * 0.68), int(w * 0.8), int(h * 0.73)))
        
        for region in [garment_top, garment_bottom]:
            edges = region.filter(ImageFilter.FIND_EDGES)
            stat = ImageStat.Stat(edges.convert("L"))
            if stat.mean[0] > 40:  # Very strong edges = possible seam
                return 55.0
        
        return 90.0
    
    @staticmethod
    def _score_color_accuracy(result_stat, orig_stat) -> float:
        """Score color accuracy between original and result."""
        if not orig_stat:
            return 80.0
        
        diffs = [abs(r - o) for r, o in zip(result_stat.mean[:3], orig_stat.mean[:3])]
        avg_diff = sum(diffs) / 3
        
        if avg_diff < 10:
            return 95.0
        elif avg_diff < 20:
            return 85.0
        elif avg_diff < 35:
            return 70.0
        else:
            return 50.0
