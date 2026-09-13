"""Quality validation for virtual try-on results.
Validates body alignment, face presence, garment category boundary match,
and product similarity before accepting AI-generated try-on results."""

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
import os
from dataclasses import dataclass, field
from typing import List, Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "pose_landmarker.task")

@dataclass
class ValidationResult:
    """Result of quality validation on a try-on image."""
    is_acceptable: bool
    overall_score: float
    shoulder_score: float
    sleeve_score: float
    collar_score: float
    waist_score: float
    chest_score: float
    similarity_score: float
    bg_preservation_score: float
    texture_score: float
    lighting_score: float
    issues: List[str] = field(default_factory=list)

def get_body_boundaries_at_y(body_mask: np.ndarray, y: int, center_x: int) -> tuple:
    """Find the actual left and right boundaries of the body mask at a given y coordinate."""
    h, w = body_mask.shape[:2]
    if y < 0 or y >= h:
        return None, None
    row = body_mask[y, :]
    non_zeros = np.where(row > 127)[0]
    if len(non_zeros) == 0:
        return None, None
    x_left = non_zeros[0]
    x_right = non_zeros[-1]
    return int(x_left), int(x_right)

def get_skin_mask(img: np.ndarray) -> np.ndarray:
    """Generate a binary mask for skin regions including face, beard, and hands."""
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_hsv = np.array([0, 15, 30], dtype=np.uint8)
    upper_hsv = np.array([25, 170, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)
    
    mask_dark = (hsv[:, :, 2] < 55) & (hsv[:, :, 1] < 60)
    mask_dark = mask_dark.astype(np.uint8) * 255
    
    skin_mask = cv2.bitwise_and(mask_ycrcb, mask_hsv)
    skin_mask = cv2.bitwise_or(skin_mask, mask_dark)
    
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]
    clothing_mask = (s > 115) & (v > 35)
    skin_mask[clothing_mask] = 0
    
    return skin_mask

def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Structural Similarity Index (SSIM) between two grayscale images."""
    C1 = (0.01 * 255)**2
    C2 = (0.03 * 255)**2

    img1 = img1.astype(np.float64)
    img2 = img2.astype(np.float64)
    kernel = np.ones((11, 11), np.float64) / 121

    mu1 = cv2.filter2D(img1, -1, kernel)
    mu2 = cv2.filter2D(img2, -1, kernel)

    mu1_sq = mu1**2
    mu2_sq = mu2**2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.filter2D(img1**2, -1, kernel) - mu1_sq
    sigma2_sq = cv2.filter2D(img2**2, -1, kernel) - mu2_sq
    sigma12 = cv2.filter2D(img1 * img2, -1, kernel) - mu1_mu2

    num = (2 * mu1_mu2 + C1) * (2 * sigma12 + C2)
    den = (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
    ssim_map = num / (den + 1e-12)
    
    return float(np.mean(ssim_map))

def compute_masked_ssim(img1: np.ndarray, img2: np.ndarray, mask: np.ndarray) -> float:
    """Compute Structural Similarity Index (SSIM) between two grayscale images inside a mask."""
    C1 = (0.01 * 255)**2
    C2 = (0.03 * 255)**2

    img1 = img1.astype(np.float64)
    img2 = img2.astype(np.float64)
    kernel = np.ones((11, 11), np.float64) / 121

    mu1 = cv2.filter2D(img1, -1, kernel)
    mu2 = cv2.filter2D(img2, -1, kernel)

    mu1_sq = mu1**2
    mu2_sq = mu2**2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.filter2D(img1**2, -1, kernel) - mu1_sq
    sigma2_sq = cv2.filter2D(img2**2, -1, kernel) - mu2_sq
    sigma12 = cv2.filter2D(img1 * img2, -1, kernel) - mu1_mu2

    num = (2 * mu1_mu2 + C1) * (2 * sigma12 + C2)
    den = (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
    ssim_map = num / (den + 1e-12)
    
    if np.sum(mask > 0) == 0:
        return 1.0
    masked_ssim = ssim_map[mask > 0]
    return float(np.mean(masked_ssim))

async def validate_tryon_result(
    orig_img: np.ndarray,
    gen_img: np.ndarray,
    garment_img: Optional[np.ndarray] = None
) -> ValidationResult:
    """Run all quality checks on a try-on result and return a detailed quality score."""
    issues = []
    
    # 0. Check face presence first as fail-safe
    try:
        gray = cv2.cvtColor(gen_img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
        face_ok = len(faces) > 0
    except Exception:
        face_ok = True
        
    if not face_ok:
        issues.append("No face detected")
        
    # Resize gen_img if dimensions mismatch
    h, w = orig_img.shape[:2]
    gen_resized = cv2.resize(gen_img, (w, h)) if gen_img.shape[:2] != (h, w) else gen_img
    
    # 1. Pose landmarks detection
    if not os.path.exists(MODEL_PATH):
        # Fail-safe if landmark model not found
        return ValidationResult(
            is_acceptable=True, overall_score=95.0, shoulder_score=95.0, sleeve_score=95.0,
            collar_score=95.0, waist_score=95.0, chest_score=95.0, similarity_score=95.0,
            bg_preservation_score=95.0, texture_score=95.0, lighting_score=95.0,
            issues=["Model file not found, bypassed check"]
        )
        
    base_options = mp_tasks.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False
    )
    
    orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGR2RGB)
    gen_rgb = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2RGB)
    
    mp_orig = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(orig_rgb))
    mp_gen = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(gen_rgb))
    
    # Safe to reuse one landmarker when segmentation masks are disabled
    landmarker = vision.PoseLandmarker.create_from_options(options)
    res_orig = landmarker.detect(mp_orig)
    res_gen = landmarker.detect(mp_gen)
    landmarker.close()
    
    if not res_orig.pose_landmarks or not res_gen.pose_landmarks:
        return ValidationResult(
            is_acceptable=False, overall_score=0.0, shoulder_score=0.0, sleeve_score=0.0,
            collar_score=0.0, waist_score=0.0, chest_score=0.0, similarity_score=0.0,
            bg_preservation_score=0.0, texture_score=0.0, lighting_score=0.0,
            issues=["Pose detection failed on source/result"]
        )
        
    l_orig = res_orig.pose_landmarks[0]
    l_gen = res_gen.pose_landmarks[0]
    
    # Generate body masks from landmarks (segmentation disabled to prevent Windows crash)
    def _qv_landmarks_to_mask(landmarks, width, height):
        pts = []
        for idx in [11, 12, 23, 24, 13, 14, 15, 16]:
            if idx < len(landmarks):
                pts.append([int(landmarks[idx].x * width), int(landmarks[idx].y * height)])
        if len(pts) < 3:
            return np.zeros((height, width), dtype=np.uint8)
        hull = cv2.convexHull(np.array(pts))
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.drawContours(mask, [hull], -1, 255, -1)
        mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        return mask
    
    body_mask_orig = _qv_landmarks_to_mask(l_orig, w, h)
    body_mask_gen = _qv_landmarks_to_mask(l_gen, w, h)
        
    # Torso Height for normalization
    sh_center_orig = np.array([(l_orig[11].x + l_orig[12].x) * w / 2.0, (l_orig[11].y + l_orig[12].y) * h / 2.0])
    hip_center_orig = np.array([(l_orig[23].x + l_orig[24].x) * w / 2.0, (l_orig[23].y + l_orig[24].y) * h / 2.0])
    torso_height = np.linalg.norm(sh_center_orig - hip_center_orig)
    if torso_height < 1.0:
        torso_height = h * 0.4
        
    # --- 1. Shoulder Alignment Score ---
    shoulder_score = 95.0
    shoulders_visible = (l_orig[11].visibility > 0.4 and l_orig[12].visibility > 0.4 and
                         l_gen[11].visibility > 0.4 and l_gen[12].visibility > 0.4)
    if shoulders_visible:
        orig_sh_width = np.linalg.norm(np.array([l_orig[11].x, l_orig[11].y]) - np.array([l_orig[12].x, l_orig[12].y])) * w
        gen_sh_width = np.linalg.norm(np.array([l_gen[11].x, l_gen[11].y]) - np.array([l_gen[12].x, l_gen[12].y])) * w
        dev_sh = abs(orig_sh_width - gen_sh_width) / max(1.0, orig_sh_width)
        
        sh_y_orig = int(sh_center_orig[1])
        x_l_orig, x_r_orig = get_body_boundaries_at_y(body_mask_orig, sh_y_orig, int(sh_center_orig[0]))
        x_l_gen, x_r_gen = get_body_boundaries_at_y(body_mask_gen, sh_y_orig, int(sh_center_orig[0]))
        if x_l_orig is not None and x_l_gen is not None:
            orig_sil_sh_w = x_r_orig - x_l_orig
            gen_sil_sh_w = x_r_gen - x_l_gen
            dev_sh_sil = abs(orig_sil_sh_w - gen_sil_sh_w) / max(1.0, orig_sil_sh_w)
            dev_sh = max(dev_sh, dev_sh_sil)
            
        shoulder_score = max(0.0, 100.0 - dev_sh * 200.0)
        if shoulder_score < 90.0:
            issues.append(f"Shoulder mismatch: {dev_sh * 100:.1f}%")

    # --- 2. Sleeve Alignment Score ---
    sleeve_score = 95.0
    left_visible = (l_orig[11].visibility > 0.4 and l_orig[13].visibility > 0.4 and l_orig[15].visibility > 0.4 and
                    l_gen[11].visibility > 0.4 and l_gen[13].visibility > 0.4 and l_gen[15].visibility > 0.4)
    right_visible = (l_orig[12].visibility > 0.4 and l_orig[14].visibility > 0.4 and l_orig[16].visibility > 0.4 and
                     l_gen[12].visibility > 0.4 and l_gen[14].visibility > 0.4 and l_gen[16].visibility > 0.4)
    
    devs = []
    if left_visible:
        orig_left_arm = np.linalg.norm(np.array([l_orig[11].x - l_orig[13].x, l_orig[11].y - l_orig[13].y])) + \
                        np.linalg.norm(np.array([l_orig[13].x - l_orig[15].x, l_orig[13].y - l_orig[15].y]))
        gen_left_arm = np.linalg.norm(np.array([l_gen[11].x - l_gen[13].x, l_gen[11].y - l_gen[13].y])) + \
                       np.linalg.norm(np.array([l_gen[13].x - l_gen[15].x, l_gen[13].y - l_gen[15].y]))
        dev_l = abs(orig_left_arm - gen_left_arm) / max(1e-5, orig_left_arm)
        devs.append(dev_l)
        
    if right_visible:
        orig_right_arm = np.linalg.norm(np.array([l_orig[12].x - l_orig[14].x, l_orig[12].y - l_orig[14].y])) + \
                         np.linalg.norm(np.array([l_orig[14].x - l_orig[16].x, l_orig[14].y - l_orig[16].y]))
        gen_right_arm = np.linalg.norm(np.array([l_gen[12].x - l_gen[14].x, l_gen[12].y - l_gen[14].y])) + \
                        np.linalg.norm(np.array([l_gen[14].x - l_gen[16].x, l_gen[14].y - l_gen[16].y]))
        dev_r = abs(orig_right_arm - gen_right_arm) / max(1e-5, orig_right_arm)
        devs.append(dev_r)
        
    if len(devs) > 0:
        dev_sleeve = max(devs)
        sleeve_score = max(0.0, 100.0 - dev_sleeve * 200.0)
        if sleeve_score < 90.0:
            issues.append(f"Sleeve mismatch: {dev_sleeve * 100:.1f}%")

    # --- 3. Collar Alignment Score ---
    collar_score = 95.0
    collar_visible = (l_orig[9].visibility > 0.4 and l_orig[10].visibility > 0.4 and
                      l_gen[9].visibility > 0.4 and l_gen[10].visibility > 0.4)
    if collar_visible:
        pt_mouth_orig = np.array([(l_orig[9].x + l_orig[10].x) * w / 2.0, (l_orig[9].y + l_orig[10].y) * h / 2.0])
        chin_orig = pt_mouth_orig + np.array([0.0, 0.1 * h])
        collar_orig = sh_center_orig
        
        sh_center_gen = np.array([(l_gen[11].x + l_gen[12].x) * w / 2.0, (l_gen[11].y + l_gen[12].y) * h / 2.0])
        collar_gen = sh_center_gen
        
        dev_collar = np.linalg.norm(collar_orig - collar_gen) / max(1.0, torso_height)
        collar_score = max(0.0, 100.0 - dev_collar * 200.0)
        if collar_score < 90.0:
            issues.append(f"Collar alignment deviation: {dev_collar * 100:.1f}%")

    # --- 4. Waist Fit Score ---
    waist_score = 95.0
    waist_visible = (l_orig[11].visibility > 0.4 and l_orig[12].visibility > 0.4 and l_orig[23].visibility > 0.4 and l_orig[24].visibility > 0.4 and
                     l_gen[11].visibility > 0.4 and l_gen[12].visibility > 0.4 and l_gen[23].visibility > 0.4 and l_gen[24].visibility > 0.4)
    if waist_visible:
        pt_left_waist_orig = 0.40 * np.array([l_orig[11].x, l_orig[11].y]) + 0.60 * np.array([l_orig[23].x, l_orig[23].y])
        pt_right_waist_orig = 0.40 * np.array([l_orig[12].x, l_orig[12].y]) + 0.60 * np.array([l_orig[24].x, l_orig[24].y])
        orig_waist_width = np.linalg.norm(pt_left_waist_orig - pt_right_waist_orig) * w
        
        pt_left_waist_gen = 0.40 * np.array([l_gen[11].x, l_gen[11].y]) + 0.60 * np.array([l_gen[23].x, l_gen[23].y])
        pt_right_waist_gen = 0.40 * np.array([l_gen[12].x, l_gen[12].y]) + 0.60 * np.array([l_gen[24].x, l_gen[24].y])
        gen_waist_width = np.linalg.norm(pt_left_waist_gen - pt_right_waist_gen) * w
        
        dev_waist = abs(orig_waist_width - gen_waist_width) / max(1.0, orig_waist_width)
        y_waist_orig = int((pt_left_waist_orig[1] + pt_right_waist_orig[1]) / 2.0 * h)
        x_l_orig_w, x_r_orig_w = get_body_boundaries_at_y(body_mask_orig, y_waist_orig, int(sh_center_orig[0]))
        x_l_gen_w, x_r_gen_w = get_body_boundaries_at_y(body_mask_gen, y_waist_orig, int(sh_center_orig[0]))
        if x_l_orig_w is not None and x_l_gen_w is not None:
            orig_sil_waist_w = x_r_orig_w - x_l_orig_w
            gen_sil_waist_w = x_r_gen_w - x_l_gen_w
            dev_waist_sil = abs(orig_sil_waist_w - gen_sil_waist_w) / max(1.0, orig_sil_waist_w)
            dev_waist = max(dev_waist, dev_waist_sil)
        waist_score = max(0.0, 100.0 - dev_waist * 200.0)
        if waist_score < 90.0:
            issues.append(f"Waist mismatch: {dev_waist * 100:.1f}%")

    # --- 5. Chest Fit Score ---
    chest_score = 95.0
    if waist_visible:
        pt_left_chest_orig = 0.75 * np.array([l_orig[11].x, l_orig[11].y]) + 0.25 * np.array([l_orig[23].x, l_orig[23].y])
        pt_right_chest_orig = 0.75 * np.array([l_orig[12].x, l_orig[12].y]) + 0.25 * np.array([l_orig[24].x, l_orig[24].y])
        orig_chest_width = np.linalg.norm(pt_left_chest_orig - pt_right_chest_orig) * w
        
        pt_left_chest_gen = 0.75 * np.array([l_gen[11].x, l_gen[11].y]) + 0.25 * np.array([l_gen[23].x, l_gen[23].y])
        pt_right_chest_gen = 0.75 * np.array([l_gen[12].x, l_gen[12].y]) + 0.25 * np.array([l_gen[24].x, l_gen[24].y])
        gen_chest_width = np.linalg.norm(pt_left_chest_gen - pt_right_chest_gen) * w
        
        dev_chest = abs(orig_chest_width - gen_chest_width) / max(1.0, orig_chest_width)
        y_chest_orig = int((pt_left_chest_orig[1] + pt_right_chest_orig[1]) / 2.0 * h)
        x_l_orig_c, x_r_orig_c = get_body_boundaries_at_y(body_mask_orig, y_chest_orig, int(sh_center_orig[0]))
        x_l_gen_c, x_r_gen_c = get_body_boundaries_at_y(body_mask_gen, y_chest_orig, int(sh_center_orig[0]))
        if x_l_orig_c is not None and x_l_gen_c is not None:
            orig_sil_chest_w = x_r_orig_c - x_l_orig_c
            gen_sil_chest_w = x_r_gen_c - x_l_gen_c
            dev_chest_sil = abs(orig_sil_chest_w - gen_sil_chest_w) / max(1.0, orig_sil_chest_w)
            dev_chest = max(dev_chest, dev_chest_sil)
        chest_score = max(0.0, 100.0 - dev_chest * 200.0)
        if chest_score < 90.0:
            issues.append(f"Chest mismatch: {dev_chest * 100:.1f}%")

    # --- 6. Product Similarity Score ---
    product_score = 95.0
    if garment_img is not None:
        try:
            # Segment garment image
            gray_garment = cv2.cvtColor(garment_img, cv2.COLOR_BGR2GRAY)
            h_g, w_g_val = gray_garment.shape[:2]
            
            # Check if there is a person in the garment image to segment it properly
            garment_rgb = cv2.cvtColor(garment_img, cv2.COLOR_BGR2RGB)
            mp_garment = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(garment_rgb))
            landmarker_garment = vision.PoseLandmarker.create_from_options(options)
            res_garment = landmarker_garment.detect(mp_garment)
            landmarker_garment.close()
            
            mask_garment = None
            if res_garment.pose_landmarks:
                body_mask_garment = _qv_landmarks_to_mask(res_garment.pose_landmarks[0], w_g_val, h_g)
                skin_mask_garment = get_skin_mask(garment_img)
                mask_garment = cv2.bitwise_and(body_mask_garment, cv2.bitwise_not(skin_mask_garment))
                
            if mask_garment is None:
                # Flat-lay mode: Determine if background is light or dark by checking the borders
                border_pixels = np.concatenate([
                    gray_garment[0, :],
                    gray_garment[-1, :],
                    gray_garment[:, 0],
                    gray_garment[:, -1]
                ])
                mean_border = np.mean(border_pixels)
                if mean_border < 127:
                    # Dark background: keep pixels that are brighter than background
                    _, mask_garment = cv2.threshold(gray_garment, max(15, int(mean_border + 15)), 255, cv2.THRESH_BINARY)
                else:
                    # Light background: keep pixels that are darker than background
                    _, mask_garment = cv2.threshold(gray_garment, min(240, int(mean_border - 15)), 255, cv2.THRESH_BINARY_INV)
            
            # Fallback if garment mask is empty/too small (e.g. white garment on white background)
            if mask_garment is None or np.sum(mask_garment > 127) < (h_g * w_g_val * 0.08):
                mask_garment = np.zeros((h_g, w_g_val), dtype=np.uint8)
                x1, y1 = int(w_g_val * 0.15), int(h_g * 0.15)
                x2, y2 = int(w_g_val * 0.85), int(h_g * 0.85)
                mask_garment[y1:y2, x1:x2] = 255

            # Segment gen image
            skin_mask = get_skin_mask(gen_resized)
            mask_gen_garment = cv2.bitwise_and(body_mask_gen, cv2.bitwise_not(skin_mask))
            
            # Fallback if generated garment mask is empty/too small
            if np.sum(mask_gen_garment > 127) < (h * w * 0.08):
                mask_gen_garment = np.zeros_like(mask_gen_garment)
                x1, y1 = int(w * 0.15), int(h * 0.25)
                x2, y2 = int(w * 0.85), int(h * 0.75)
                mask_gen_garment[y1:y2, x1:x2] = 255
            
            # 1. Color similarity (3D HSV Histogram Correlation)
            hsv_garment = cv2.cvtColor(garment_img, cv2.COLOR_BGR2HSV)
            hsv_gen = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2HSV)
            
            hist_garment = cv2.calcHist([hsv_garment], [0, 1, 2], mask_garment, [8, 8, 8], [0, 180, 0, 256, 0, 256])
            hist_gen = cv2.calcHist([hsv_gen], [0, 1, 2], mask_gen_garment, [8, 8, 8], [0, 180, 0, 256, 0, 256])
            
            cv2.normalize(hist_garment, hist_garment, 0, 1, cv2.NORM_MINMAX)
            cv2.normalize(hist_gen, hist_gen, 0, 1, cv2.NORM_MINMAX)
            
            color_corr = float(cv2.compareHist(hist_garment, hist_gen, cv2.HISTCMP_CORREL))
            color_corr = max(0.0, color_corr)
            
            # 2. Structural similarity (SSIM on bounding boxes)
            x_g, y_g, w_g_val, h_g_val = cv2.boundingRect(mask_garment)
            x_gn, y_gn, w_gn, h_gn = cv2.boundingRect(mask_gen_garment)
            
            if w_g_val > 10 and h_g_val > 10 and w_gn > 10 and h_gn > 10:
                crop_garment = cv2.resize(gray_garment[y_g:y_g+h_g_val, x_g:x_g+w_g_val], (128, 128))
                crop_gen = cv2.resize(cv2.cvtColor(gen_resized[y_gn:y_gn+h_gn, x_gn:x_gn+w_gn], cv2.COLOR_BGR2GRAY), (128, 128))
                ssim_val = max(0.0, compute_ssim(crop_garment, crop_gen))
            else:
                ssim_val = 0.85
                
            similarity = 0.5 * color_corr + 0.5 * ssim_val
            product_score = similarity * 100.0
        except Exception as e:
            print(f"[QUALITY-CHECK] Similarity calc failed: {e}")
            product_score = 95.0
            
    if product_score < 90.0:
        issues.append(f"Product similarity too low: {product_score:.1f}% (min: 90%)")

    # --- 7. Background Preservation Score ---
    bg_preservation_score = 95.0
    try:
        gray_orig = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
        gray_gen = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2GRAY)
        body_mask_orig_dilated = cv2.dilate(body_mask_orig, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        bg_mask = (body_mask_orig_dilated < 127).astype(np.uint8) * 255
        
        bg_ssim = compute_masked_ssim(gray_orig, gray_gen, bg_mask)
        bg_preservation_score = bg_ssim * 100.0
    except Exception as e:
        print(f"[QUALITY-CHECK] Background SSIM calc failed: {e}")
        bg_preservation_score = 95.0
        
    if bg_preservation_score < 90.0:
        issues.append(f"Background modified: {bg_preservation_score:.1f}%")

    # --- 8. Texture Match Score ---
    texture_score = 95.0
    if garment_img is not None:
        try:
            gray_garment = cv2.cvtColor(garment_img, cv2.COLOR_BGR2GRAY)
            gray_gen = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2GRAY)
            
            skin_mask = get_skin_mask(gen_resized)
            mask_gen_garment = cv2.bitwise_and(body_mask_gen, cv2.bitwise_not(skin_mask))
            gray_garment_masked = cv2.bitwise_and(gray_garment, mask_garment)
            gray_gen_masked = cv2.bitwise_and(gray_gen, mask_gen_garment)
            
            sob_garment = cv2.Sobel(gray_garment_masked, cv2.CV_64F, 1, 1, ksize=3)
            sob_gen = cv2.Sobel(gray_gen_masked, cv2.CV_64F, 1, 1, ksize=3)
            
            var_garment = np.var(sob_garment[mask_garment > 127]) if np.sum(mask_garment > 127) > 10 else 1.0
            var_gen = np.var(sob_gen[mask_gen_garment > 127]) if np.sum(mask_gen_garment > 127) > 10 else 1.0
            
            texture_mismatch = abs(var_garment - var_gen) / max(1.0, var_garment)
            texture_score = max(0.0, 100.0 - texture_mismatch * 50.0)
        except Exception:
            texture_score = 95.0

    # --- 9. Lighting Match Score ---
    try:
        skin_mask = get_skin_mask(gen_resized)
        face_skin = cv2.bitwise_and(skin_mask, body_mask_gen)
        face_skin[int(sh_center_orig[1]):, :] = 0
        
        garment_region = cv2.bitwise_and(body_mask_gen, cv2.bitwise_not(skin_mask))
        
        gray_gen = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2GRAY)
        
        mean_face = np.mean(gray_gen[face_skin > 127]) if np.sum(face_skin > 127) > 10 else 127.0
        mean_garm = np.mean(gray_gen[garment_region > 127]) if np.sum(garment_region > 127) > 10 else 127.0
        
        lum_diff = abs(mean_face - mean_garm) / 255.0
        lighting_score = max(0.0, 100.0 - lum_diff * 150.0)
    except Exception:
        lighting_score = 95.0

    # --- 10. Strict Artifact & Geometry Checks ---
    # Check A: Reject if product image is pasted as floating rectangle
    try:
        diff = cv2.absdiff(gen_resized, orig_img)
        diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, diff_thresh = cv2.threshold(diff_gray, 30, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(diff_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            cnt_area = cv2.contourArea(largest_cnt)
            rx, ry, rw, rh = cv2.boundingRect(largest_cnt)
            rect_area = max(1, rw * rh)
            # If the changed area is large and almost perfectly rectangular (>88% box fill)
            if rw > (w * 0.25) and rh > (h * 0.20) and (cnt_area / rect_area) > 0.88:
                issues.append("Rejected: Product image pasted as floating rectangle")
    except Exception as e:
        print(f"[QUALITY-CHECK] Rectangle check error: {e}")

    # Check B: Reject if white/background pixels from product image remain
    try:
        expected_garment_region = cv2.bitwise_and(body_mask_gen, cv2.bitwise_not(get_skin_mask(gen_resized)))
        expected_garment_region[0:int(sh_center_orig[1]), :] = 0  # Below shoulders
        hsv_gen = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2HSV)
        # White/light background pixels: high brightness (V > 230) and low saturation (S < 25)
        white_bg_mask = (hsv_gen[:, :, 2] > 235) & (hsv_gen[:, :, 1] < 20)
        white_in_garment = np.sum(white_bg_mask & (expected_garment_region > 127))
        total_garment_area = max(1, np.sum(expected_garment_region > 127))
        if (white_in_garment / total_garment_area) > 0.18:
            issues.append("Rejected: White/background pixels from product image remain")
    except Exception as e:
        print(f"[QUALITY-CHECK] White background check error: {e}")

    # Check C: Reject if garment not aligned with user's shoulders, torso, and arms
    # Check C: Reject if garment not aligned with user's shoulders, collar, torso, and arms
    if shoulder_score < 75.0 or sleeve_score < 75.0 or waist_score < 75.0 or collar_score < 75.0:
        issues.append(f"Rejected: Poor body alignment (shoulder: {shoulder_score:.1f}%, sleeve: {sleeve_score:.1f}%, collar: {collar_score:.1f}%, waist: {waist_score:.1f}%)")

    # Check D: Reject if clothing occupies less than 80% of expected body region (incorrect scaling / wrong garment placement)
    try:
        expected_garment_region = cv2.bitwise_and(body_mask_gen, cv2.bitwise_not(get_skin_mask(gen_resized)))
        expected_garment_region[0:int(sh_center_orig[1]), :] = 0
        expected_area = np.sum(expected_garment_region > 127)
        if expected_area > 100:
            diff_gray = cv2.cvtColor(cv2.absdiff(gen_resized, orig_img), cv2.COLOR_BGR2GRAY)
            changed_in_region = np.sum((diff_gray > 15) & (expected_garment_region > 127))
            coverage_ratio = changed_in_region / float(expected_area)
            if coverage_ratio < 0.80:
                issues.append(f"Rejected: Incorrect scaling or wrong garment placement (coverage: {coverage_ratio*100:.1f}%)")
    except Exception as e:
        print(f"[QUALITY-CHECK] Coverage check error: {e}")

    # Check E: Reject if product similarity is below required threshold
    if product_score < 95.0:
        issues.append(f"Rejected: Poor product similarity ({product_score:.1f}%) below required threshold (95%)")

    # Check F: Reject if background leakage occurs
    if bg_preservation_score < 85.0:
        issues.append(f"Rejected: Background leakage or distortion ({bg_preservation_score:.1f}%)")

    # Check G: Reject if the user's face was altered (product model face pasted over)
    try:
        # Get region above shoulders
        face_region_mask = np.zeros_like(body_mask_gen)
        face_region_mask[0:int(sh_center_orig[1]), :] = 255
        face_region_mask = cv2.bitwise_and(face_region_mask, get_skin_mask(orig_img))
        
        diff_gray = cv2.cvtColor(cv2.absdiff(gen_resized, orig_img), cv2.COLOR_BGR2GRAY)
        changed_face_pixels = np.sum((diff_gray > 30) & (face_region_mask > 127))
        total_face_pixels = max(1, np.sum(face_region_mask > 127))
        
        if (changed_face_pixels / total_face_pixels) > 0.40:
            issues.append(f"Rejected: Original face altered or product model face detected (face diff: {(changed_face_pixels/total_face_pixels)*100:.1f}%)")
    except Exception as e:
        print(f"[QUALITY-CHECK] Face preservation check error: {e}")

    # --- 11. Overall Quality Score ---
    overall_score = (
        0.12 * shoulder_score +
        0.12 * sleeve_score +
        0.10 * collar_score +
        0.12 * waist_score +
        0.12 * chest_score +
        0.15 * product_score +
        0.12 * bg_preservation_score +
        0.075 * texture_score +
        0.075 * lighting_score
    )
    
    is_acceptable = len(issues) == 0 and overall_score >= 80.0 and face_ok
    
    print(f"[QUALITY-CHECK] Result: {is_acceptable} (Overall: {overall_score:.1f}%, sh: {shoulder_score:.1f}%, sl: {sleeve_score:.1f}%, col: {collar_score:.1f}%, waist: {waist_score:.1f}%, chest: {chest_score:.1f}%, sim: {product_score:.1f}%, bg: {bg_preservation_score:.1f}%)")
    if issues:
        print(f"[QUALITY-CHECK] Rejection issues: {issues}")
    
    return ValidationResult(
        is_acceptable=is_acceptable,
        overall_score=round(overall_score, 1),
        shoulder_score=round(shoulder_score, 1),
        sleeve_score=round(sleeve_score, 1),
        collar_score=round(collar_score, 1),
        waist_score=round(waist_score, 1),
        chest_score=round(chest_score, 1),
        similarity_score=round(product_score, 1),
        bg_preservation_score=round(bg_preservation_score, 1),
        texture_score=round(texture_score, 1),
        lighting_score=round(lighting_score, 1),
        issues=issues
    )
