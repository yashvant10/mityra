import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
from scipy.interpolate import Rbf
import os
import base64
import io
import httpx
import re
from typing import Optional, Tuple, Dict, Any, List

# Initialize model path
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "pose_landmarker.task")

async def get_image_from_url_or_base64(url: str) -> np.ndarray:
    """Download or decode an image URL/base64 string into an OpenCV image."""
    if url.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.+)$", url)
        if match:
            buf = base64.b64decode(match.group(2))
            nparr = np.frombuffer(buf, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
                
    # If it's a local /api/tryon/image/ url, fetch it from the filesystem if possible to avoid HTTP latency
    if "/api/tryon/image/" in url:
        match = re.search(r"/api/tryon/image/([a-f0-9\-]+)$", url)
        if match:
            img_id = match.group(1)
            # Check standard formats
            for ext in ["png", "jpg", "jpeg"]:
                local_path = os.path.join(os.path.dirname(__file__), "..", "temp_images", f"{img_id}.{ext}")
                if os.path.exists(local_path):
                    img = cv2.imread(local_path)
                    if img is not None:
                        return img

    # Fallback to HTTP download
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(url)
        if res.status_code != 200:
            raise ValueError(f"Failed to fetch image from URL (HTTP {res.status_code}): {url}")
        nparr = np.frombuffer(res.content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image bytes fetched from URL")
        return img

def calculate_measurements_from_landmarks(landmarks, w, h) -> dict:
    """Calculate body measurements from pose landmarks in pixel dimensions."""
    if not landmarks or len(landmarks) < 33:
        return {}

    def get_pt(idx):
        return np.array([landmarks[idx].x * w, landmarks[idx].y * h])

    # 1. Shoulder width: distance between 11 (left shoulder) and 12 (right shoulder)
    pt_11 = get_pt(11)
    pt_12 = get_pt(12)
    shoulder_width = np.linalg.norm(pt_11 - pt_12)

    # 2. Hips: distance between 23 and 24
    pt_23 = get_pt(23)
    pt_24 = get_pt(24)
    hip_width = np.linalg.norm(pt_23 - pt_24)

    # 3. Chest (interpolated at 25% down shoulders-to-hips path)
    pt_left_chest = 0.75 * pt_11 + 0.25 * pt_23
    pt_right_chest = 0.75 * pt_12 + 0.25 * pt_24
    chest_width = np.linalg.norm(pt_left_chest - pt_right_chest)

    # 4. Waist (interpolated at 60% down shoulders-to-hips path)
    pt_left_waist = 0.40 * pt_11 + 0.60 * pt_23
    pt_right_waist = 0.40 * pt_12 + 0.60 * pt_24
    waist_width = np.linalg.norm(pt_left_waist - pt_right_waist)

    # 5. Arm Lengths: sum of shoulder-to-elbow and elbow-to-wrist
    pt_13 = get_pt(13) # left elbow
    pt_14 = get_pt(14) # right elbow
    pt_15 = get_pt(15) # left wrist
    pt_16 = get_pt(16) # right wrist

    left_arm_length = np.linalg.norm(pt_11 - pt_13) + np.linalg.norm(pt_13 - pt_15)
    right_arm_length = np.linalg.norm(pt_12 - pt_14) + np.linalg.norm(pt_14 - pt_16)
    avg_arm_length = (left_arm_length + right_arm_length) / 2.0

    # 6. Height Estimation
    # Find head top using nose (0) and ear landmarks (7, 8)
    pt_nose = get_pt(0)
    pt_left_ear = get_pt(7)
    pt_right_ear = get_pt(8)
    ear_midpoint = (pt_left_ear + pt_right_ear) / 2.0
    
    head_offset = 1.5 * np.linalg.norm(pt_nose - ear_midpoint)
    y_head_top = pt_nose[1] - head_offset

    # Check if feet are visible
    feet_visible = (landmarks[27].visibility > 0.5 and landmarks[28].visibility > 0.5)
    
    if feet_visible:
        pt_27 = get_pt(27)
        pt_28 = get_pt(28)
        y_foot_bottom = max(pt_27[1], pt_28[1])
        height_span = y_foot_bottom - y_head_top
    else:
        # Fallback to torso length ratio (torso is approx 1/2.8 of total height)
        torso_mid_shoulder = (pt_11 + pt_12) / 2.0
        torso_mid_hip = (pt_23 + pt_24) / 2.0
        torso_length = np.linalg.norm(torso_mid_shoulder - torso_mid_hip)
        height_span = torso_length * 2.8

    return {
        "shoulder_width": round(shoulder_width, 1),
        "chest_width": round(chest_width, 1),
        "waist_width": round(waist_width, 1),
        "hip_width": round(hip_width, 1),
        "left_arm_length": round(left_arm_length, 1),
        "right_arm_length": round(right_arm_length, 1),
        "avg_arm_length": round(avg_arm_length, 1),
        "height_span": round(height_span, 1),
        "left_chest_point": pt_left_chest,
        "right_chest_point": pt_right_chest,
        "left_waist_point": pt_left_waist,
        "right_waist_point": pt_right_waist
    }

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
    
    # Filter out highly saturated clothing (e.g. bright yellow, orange, red garments).
    # Skin saturation rarely exceeds 120, whereas bright clothing has S > 120.
    s = hsv[:, :, 1]
    h = hsv[:, :, 0]
    v = hsv[:, :, 2]
    
    clothing_mask = (s > 115) & (v > 35)
    yellow_clothing = (h >= 8) & (h <= 40) & (s > 35) & (v > 30)
    
    skin_mask[clothing_mask] = 0
    skin_mask[yellow_clothing] = 0
    
    return skin_mask

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

def detect_garment_category(
    category_field: Optional[str],
    subcategory_field: Optional[str],
    name: Optional[str],
    description: Optional[str]
) -> str:
    """Detect garment category from fields or text keywords to apply category-specific fitting."""
    cat = (category_field or "").lower()
    subcat = (subcategory_field or "").lower()
    text = f"{name or ''} {description or ''}".lower()
    
    # Check oversized keywords first
    if "oversized" in text or "loose fit" in text or "oversize" in cat or "oversize" in subcat:
        return "oversized_tshirt"
    
    # 1. Direct field mappings & keywords
    if "polo" in cat or "polo" in subcat or "polo" in text:
        return "polo"
    if "tshirt" in cat or "t-shirt" in cat or "tee" in cat or "tshirts" in cat or "t-shirt" in text or "tshirt" in text or "tee" in text:
        return "tshirt"
    if "shirt" in cat or "shirt" in text:
        return "shirt"
    if "hoodie" in cat or "hoodie" in text or "hooded" in text:
        return "hoodie"
    if "kurta" in cat or "ethnic" in cat or "kurta" in text or "ethnic" in text or "sherwani" in text:
        return "kurta"
    if "blazer" in cat or "suit" in cat or "blazers" in cat or "blazer" in text or "suit" in text:
        return "blazer"
    if "sweater" in cat or "cardigan" in cat or "pullover" in cat or "sweater" in text or "cardigan" in text or "pullover" in text:
        return "sweater"
    if "coat" in cat or "trench" in cat or "coat" in text or "trench" in text:
        return "coat"
    if "jacket" in cat or "outerwear" in cat or "bomber" in cat or "jacket" in text or "outerwear" in text:
        return "jacket"
        
    return "tshirt"  # default fallback


def get_arm_boundaries(
    body_mask: np.ndarray,
    joint_pt: np.ndarray,
    dir_vec: np.ndarray,
    max_search: float = 60.0
) -> Tuple[Optional[Tuple[int, int]], Optional[Tuple[int, int]]]:
    """Find left and right sleeve/arm boundary points perpendicular to the arm's direction vector."""
    # Perpendicular unit vector
    p_vec = np.array([-dir_vec[1], dir_vec[0]])
    norm = np.linalg.norm(p_vec)
    if norm < 1e-5:
        return None, None
    p_vec = p_vec / norm
    
    h, w = body_mask.shape[:2]
    
    # Helper to find edge
    def find_edge(direction):
        for step in range(1, int(max_search)):
            test_pt = joint_pt + direction * step * p_vec
            x, y = int(test_pt[0]), int(test_pt[1])
            if x < 0 or x >= w or y < 0 or y >= h:
                return tuple((test_pt - direction * p_vec).astype(int))
            if body_mask[y, x] < 127: # outside body
                return (x, y)
        return tuple((joint_pt + direction * max_search * p_vec).astype(int))
        
    edge1 = find_edge(1.0)
    edge2 = find_edge(-1.0)
    return edge1, edge2

def enhance_fabric_details(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Enhance high-frequency folds/wrinkles using LAB space CLAHE without shifting color."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to enhance local contrast details (folds/wrinkles)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    
    # Soft blend based on mask
    mask_float = mask.astype(float) / 255.0
    l_final = (l_enhanced * mask_float + l.astype(float) * (1.0 - mask_float)).astype(np.uint8)
    
    lab_final = cv2.merge((l_final, a, b))
    return cv2.cvtColor(lab_final, cv2.COLOR_LAB2BGR)

def preserve_body_shape(
    orig_img: np.ndarray,
    gen_img: np.ndarray,
    garment_category: Optional[str] = None,
    garment_subcategory: Optional[str] = None,
    clothing_name: Optional[str] = None,
    clothing_description: Optional[str] = None
) -> np.ndarray:
    """Warp the generated image to match the original human image's body proportions, preserving identity."""
    h, w, c = orig_img.shape
    
    # Resize gen_img if there's a mismatch
    if gen_img.shape != orig_img.shape:
        gen_img = cv2.resize(gen_img, (w, h))
        
    category = detect_garment_category(garment_category, garment_subcategory, clothing_name, clothing_description)
    print(f"[BODY-PRESERVE] Detected garment category: '{category}'")
    
    # Look up adaptive fitting profile:
    profile = {
        "shoulder_tolerance": 0.0,
        "chest_tolerance": 0.0,
        "sleeve_tolerance": 0.0,
        "waist_tolerance": 0.0,
        "hip_tolerance": 0.0,
        "looseness": 1.03,
        "loose_fitting": False
    }
    
    clothing_desc_text = f"{clothing_name or ''} {clothing_description or ''}".lower()
    if "oversized" in clothing_desc_text or "loose fit" in clothing_desc_text or "oversized" in category:
        profile["shoulder_tolerance"] = 0.08
        profile["chest_tolerance"] = 0.10
        profile["sleeve_tolerance"] = 0.08
        profile["waist_tolerance"] = 0.12
        profile["hip_tolerance"] = 0.12
        profile["looseness"] = 1.12
        profile["loose_fitting"] = True
    elif "denim" in clothing_desc_text or category in ["jacket", "coat", "sweater"]:
        profile["shoulder_tolerance"] = 0.05
        profile["chest_tolerance"] = 0.04
        profile["sleeve_tolerance"] = 0.05
        profile["waist_tolerance"] = 0.04
        profile["hip_tolerance"] = 0.04
        profile["looseness"] = 1.06
    elif category == "hoodie":
        profile["shoulder_tolerance"] = 0.06
        profile["chest_tolerance"] = 0.08
        profile["sleeve_tolerance"] = 0.08
        profile["waist_tolerance"] = 0.08
        profile["hip_tolerance"] = 0.08
        profile["looseness"] = 1.08
        profile["loose_fitting"] = True
    elif category == "polo":
        profile["shoulder_tolerance"] = 0.03
        profile["chest_tolerance"] = 0.03
        profile["sleeve_tolerance"] = 0.03
        profile["waist_tolerance"] = 0.02
        profile["hip_tolerance"] = 0.02
        profile["looseness"] = 1.03
    elif category in ["shirt", "slim shirt"]:
        profile["shoulder_tolerance"] = 0.02
        profile["chest_tolerance"] = 0.02
        profile["sleeve_tolerance"] = 0.02
        profile["waist_tolerance"] = 0.02
        profile["hip_tolerance"] = 0.02
        profile["looseness"] = 1.02 if "slim" in clothing_desc_text or "slim" in category else 1.03
    elif category == "kurta":
        profile["shoulder_tolerance"] = 0.04
        profile["chest_tolerance"] = 0.05
        profile["sleeve_tolerance"] = 0.04
        profile["waist_tolerance"] = 0.08
        profile["hip_tolerance"] = 0.10
        profile["looseness"] = 1.08
        profile["loose_fitting"] = True
    elif category == "blazer":
        profile["shoulder_tolerance"] = 0.04
        profile["chest_tolerance"] = 0.03
        profile["sleeve_tolerance"] = 0.03
        profile["waist_tolerance"] = 0.02
        profile["hip_tolerance"] = 0.02
        profile["looseness"] = 1.04
    else:  # tshirt or default
        profile["shoulder_tolerance"] = 0.01
        profile["chest_tolerance"] = 0.01
        profile["sleeve_tolerance"] = 0.01
        profile["looseness"] = 1.03
        
    is_short_sleeve_text = False
    if category in ["tshirt", "dress"] or "t-shirt" in clothing_desc_text or "tshirt" in clothing_desc_text or "tee" in clothing_desc_text:
        is_short_sleeve_text = True
    elif "short sleeve" in clothing_desc_text or "half sleeve" in clothing_desc_text or "sleeveless" in clothing_desc_text or "polo" in clothing_desc_text or "tank top" in clothing_desc_text or "vest" in clothing_desc_text:
        is_short_sleeve_text = True
    print(f"[BODY-PRESERVE] Garment detected as short-sleeve/sleeveless from text: {is_short_sleeve_text}")
    is_short_sleeve = is_short_sleeve_text
        
    if not os.path.exists(MODEL_PATH):
        print(f"[BODY-PRESERVE] Warning: pose_landmarker.task model file not found at {MODEL_PATH}")
        return gen_img
        
    # Setup MediaPipe Options — segmentation masks DISABLED to prevent
    # fatal C++ crash on Windows (image_frame.cc ChannelSize mismatch)
    base_options = mp_tasks.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False
    )
    
    # MediaPipe requires RGB images (exactly 3 channels)
    # Handle RGBA (4-channel) images from HuggingFace PNG output
    if len(orig_img.shape) == 2:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_GRAY2RGB)
    elif orig_img.shape[2] == 4:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGRA2RGB)
        gen_img = cv2.cvtColor(orig_img, cv2.COLOR_BGRA2BGR)
    else:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGR2RGB)
    
    if len(gen_img.shape) == 2:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_GRAY2RGB)
    elif gen_img.shape[2] == 4:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_BGRA2RGB)
        gen_img = cv2.cvtColor(gen_img, cv2.COLOR_BGRA2BGR)
    else:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_BGR2RGB)
    
    mp_orig = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(orig_rgb))
    mp_gen = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(gen_rgb))
    
    # Use a single landmarker (safe without segmentation masks)
    landmarker = vision.PoseLandmarker.create_from_options(options)
    res_orig = landmarker.detect(mp_orig)
    res_gen = landmarker.detect(mp_gen)
    landmarker.close()
    
    # If landmarks are not detected, fail-safe to original generated image
    if not res_orig.pose_landmarks or not res_gen.pose_landmarks:
        print("[BODY-PRESERVE] Warning: MediaPipe Pose failed to detect landmarks on one or both images.")
        return gen_img
        
    l_orig = res_orig.pose_landmarks[0]
    l_gen = res_gen.pose_landmarks[0]
    
    # Body measurement system RE-ENABLED for production-quality fitting.
    m_orig = calculate_measurements_from_landmarks(l_orig, w, h)
    m_gen = calculate_measurements_from_landmarks(l_gen, w, h)
    
    # Fallback: if measurement calculation fails, continue with basic landmarks only
    if not m_orig or not m_gen:
        print("[BODY-PRESERVE] Warning: Measurement calculation failed. Using basic landmarks only.")
        m_orig = None
        m_gen = None
    
    # Check if wrists are bare skin in the generated image to override is_short_sleeve
    is_short_sleeve = is_short_sleeve_text
    if res_gen.pose_landmarks and len(res_gen.pose_landmarks) > 0:
        sh_center_gen = np.array([(l_gen[11].x + l_gen[12].x) * w / 2.0, (l_gen[11].y + l_gen[12].y) * h / 2.0])
        hip_center_gen = np.array([(l_gen[23].x + l_gen[24].x) * w / 2.0, (l_gen[23].y + l_gen[24].y) * h / 2.0])
        torso_height_gen = np.linalg.norm(sh_center_gen - hip_center_gen)
        
        gen_skin_mask = get_skin_mask(gen_img)
        wrists_bare = 0
        for idx in [15, 16]:
            cx = int(l_gen[idx].x * w)
            cy = int(l_gen[idx].y * h)
            r = max(10, int(torso_height_gen * 0.05))
            x1 = max(0, cx - r)
            x2 = min(w, cx + r)
            y1 = max(0, cy - r)
            y2 = min(h, cy + r)
            if x2 > x1 and y2 > y1:
                roi = gen_skin_mask[y1:y2, x1:x2]
                if np.mean(roi > 127) > 0.15:
                    wrists_bare += 1
        if wrists_bare >= 1:
            is_short_sleeve = True
            print(f"[BODY-PRESERVE] Bare arm detection: Wrists bare in gen_img. Overrode is_short_sleeve to True.")
    
    if m_orig and m_gen:
        print(f"[BODY-PRESERVE] Body measurements active — shoulder: {m_orig['shoulder_width']:.0f}px, chest: {m_orig['chest_width']:.0f}px, waist: {m_orig['waist_width']:.0f}px")
    else:
        print("[BODY-PRESERVE] Body measurements unavailable — using basic pose landmarks only.")
        
    # Generate body masks from pose landmarks (convex hull)
    # MediaPipe segmentation masks are disabled to prevent Windows crash
    def _landmarks_to_body_mask(landmarks, width, height):
        """Generate a body mask from pose landmarks using convex hull."""
        body_indices = [11, 12, 23, 24]  # shoulders + hips for torso
        pts = []
        for idx in body_indices:
            if idx < len(landmarks):
                px = int(landmarks[idx].x * width)
                py = int(landmarks[idx].y * height)
                pts.append([px, py])
        # Add extended points for fuller body coverage
        for idx in [13, 14, 15, 16, 25, 26]:  # elbows, wrists, knees
            if idx < len(landmarks):
                px = int(landmarks[idx].x * width)
                py = int(landmarks[idx].y * height)
                pts.append([px, py])
        if len(pts) < 3:
            return None
        hull = cv2.convexHull(np.array(pts))
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.drawContours(mask, [hull], -1, 255, -1)
        # Dilate to cover natural body bounds
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        mask = cv2.dilate(mask, kernel)
        return mask
    
    body_mask_orig = _landmarks_to_body_mask(l_orig, w, h)
    body_mask_gen = _landmarks_to_body_mask(l_gen, w, h)

    # ─── Collect Control Points ───
    src_pts = []
    dst_pts = []
    
    # Indices of landmarks to track (head/face + upper body + lower body)
    key_indices = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,  # Head & Face
        11, 12, 13, 14, 15, 16,            # Shoulders, Elbows, Wrists
        23, 24, 25, 26, 27, 28             # Hips, Knees, Ankles
    ]
    
    for idx in key_indices:
        if idx < len(l_orig) and idx < len(l_gen):
            src_pts.append([l_gen[idx].x * w, l_gen[idx].y * h])
            dst_pts.append([l_orig[idx].x * w, l_orig[idx].y * h])
            
    # Inject detailed chest, waist, shoulder center, neck and arm control points
    if m_orig and m_gen:
        def get_pt_orig(idx):
            return np.array([l_orig[idx].x * w, l_orig[idx].y * h])
        def get_pt_gen(idx):
            return np.array([l_gen[idx].x * w, l_gen[idx].y * h])
            
        orig_11, orig_12 = get_pt_orig(11), get_pt_orig(12)
        gen_11, gen_12 = get_pt_gen(11), get_pt_gen(12)
        orig_13, orig_14 = get_pt_orig(13), get_pt_orig(14)
        gen_13, gen_14 = get_pt_gen(13), get_pt_gen(14)
        orig_15, orig_16 = get_pt_orig(15), get_pt_orig(16)
        gen_15, gen_16 = get_pt_gen(15), get_pt_gen(16)
        orig_23, orig_24 = get_pt_orig(23), get_pt_orig(24)
        gen_23, gen_24 = get_pt_gen(23), get_pt_gen(24)
        
        orig_sh_center = (orig_11 + orig_12) / 2.0
        gen_sh_center = (gen_11 + gen_12) / 2.0
        
        # Calculate Y levels for shoulder, chest, waist, hips
        y_shoulder = int(orig_sh_center[1])
        y_shoulder_gen = int(gen_sh_center[1])
        y_hip = int((orig_23[1] + orig_24[1]) / 2.0)
        y_hip_gen = int((gen_23[1] + gen_24[1]) / 2.0)
        
        # 1. Torso Silhouette Boundaries sampling (20 levels from shoulder to hip)
        if body_mask_orig is not None and body_mask_gen is not None:
            for pct in np.linspace(0.0, 1.0, 20):
                y_curr = int(y_shoulder + pct * (y_hip - y_shoulder))
                y_curr_gen = int(y_shoulder_gen + pct * (y_hip_gen - y_shoulder_gen))
                
                if y_curr < h and y_curr_gen < h:
                    x_l_orig, x_r_orig = get_body_boundaries_at_y(body_mask_orig, y_curr, int(orig_sh_center[0]))
                    x_l_gen, x_r_gen = get_body_boundaries_at_y(body_mask_gen, y_curr_gen, int(gen_sh_center[0]))
                    if x_l_orig is not None and x_l_gen is not None:
                        # Direct user silhouette scaling with natural looseness L
                        x_center = (x_l_orig + x_r_orig) / 2.0
                        half_w = (x_r_orig - x_l_orig) / 2.0
                        L = profile["looseness"]
                        target_l = int(x_center - half_w * L)
                        target_r = int(x_center + half_w * L)
                        
                        src_pts.append([x_l_gen, y_curr_gen])
                        dst_pts.append([target_l, y_curr])
                        src_pts.append([x_r_gen, y_curr_gen])
                        dst_pts.append([target_r, y_curr])

        # 2. Torso Internal Grid points (4x3 grid) to prevent fabric distortions
        if body_mask_orig is not None and body_mask_gen is not None:
            for pct_y in [0.2, 0.4, 0.6, 0.8]:
                y_curr = int(y_shoulder + pct_y * (y_hip - y_shoulder))
                y_curr_gen = int(y_shoulder_gen + pct_y * (y_hip_gen - y_shoulder_gen))
                for pct_x in [0.25, 0.50, 0.75]:
                    x_l_orig, x_r_orig = get_body_boundaries_at_y(body_mask_orig, y_curr, int(orig_sh_center[0]))
                    x_l_gen, x_r_gen = get_body_boundaries_at_y(body_mask_gen, y_curr_gen, int(gen_sh_center[0]))
                    if x_l_orig is not None and x_l_gen is not None:
                        orig_x = int(x_l_orig + pct_x * (x_r_orig - x_l_orig))
                        gen_x = int(x_l_gen + pct_x * (x_r_gen - x_l_gen))
                        src_pts.append([gen_x, y_curr_gen])
                        dst_pts.append([orig_x, y_curr])
        
        # Center Chest
        src_pts.append(list((m_gen["left_chest_point"] + m_gen["right_chest_point"]) / 2.0))
        dst_pts.append(list((m_orig["left_chest_point"] + m_orig["right_chest_point"]) / 2.0))
        
        # Center Waist
        src_pts.append(list((m_gen["left_waist_point"] + m_gen["right_waist_point"]) / 2.0))
        dst_pts.append(list((m_orig["left_waist_point"] + m_orig["right_waist_point"]) / 2.0))
        
        # Mid Shoulder center
        src_pts.append(list((get_pt_gen(11) + get_pt_gen(12)) / 2.0))
        dst_pts.append(list((get_pt_orig(11) + get_pt_orig(12)) / 2.0))
        
        # Mid Hip center
        src_pts.append(list((get_pt_gen(23) + get_pt_gen(24)) / 2.0))
        dst_pts.append(list((get_pt_orig(23) + get_pt_orig(24)) / 2.0))
        
        # 3. Dense Sleeve Control Points (8 points per arm: Shoulder, 20%, 40%, 60%, 80%, Elbow, Forearm, Wrist)
        if body_mask_orig is not None and body_mask_gen is not None:
            # Left Arm Upper (Shoulder to Elbow)
            for pct in [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]:
                pt_orig = orig_11 * (1.0 - pct) + orig_13 * pct
                pt_gen = gen_11 * (1.0 - pct) + gen_13 * pct
                dir_orig = orig_13 - orig_11
                dir_gen = gen_13 - gen_11
                edge_orig_1, edge_orig_2 = get_arm_boundaries(body_mask_orig, pt_orig, dir_orig)
                edge_gen_1, edge_gen_2 = get_arm_boundaries(body_mask_gen, pt_gen, dir_gen)
                if edge_orig_1 is not None and edge_gen_1 is not None:
                    # Enforce constraint: never stretch outside arm mask (fit exactly)
                    src_pts.append(list(edge_gen_1))
                    dst_pts.append(list(edge_orig_1))
                    src_pts.append(list(edge_gen_2))
                    dst_pts.append(list(edge_orig_2))

            # Left Arm Lower (Elbow to Wrist)
            for pct in [0.5, 1.0]: # Forearm and Wrist
                pt_orig = orig_13 * (1.0 - pct) + orig_15 * pct
                pt_gen = gen_13 * (1.0 - pct) + gen_15 * pct
                dir_orig = orig_15 - orig_13
                dir_gen = gen_15 - gen_13
                edge_orig_1, edge_orig_2 = get_arm_boundaries(body_mask_orig, pt_orig, dir_orig)
                edge_gen_1, edge_gen_2 = get_arm_boundaries(body_mask_gen, pt_gen, dir_gen)
                if edge_orig_1 is not None and edge_gen_1 is not None:
                    src_pts.append(list(edge_gen_1))
                    dst_pts.append(list(edge_orig_1))
                    src_pts.append(list(edge_gen_2))
                    dst_pts.append(list(edge_orig_2))

            # Right Arm Upper (Shoulder to Elbow)
            for pct in [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]:
                pt_orig = orig_12 * (1.0 - pct) + orig_14 * pct
                pt_gen = gen_12 * (1.0 - pct) + gen_14 * pct
                dir_orig = orig_14 - orig_12
                dir_gen = gen_14 - gen_12
                edge_orig_1, edge_orig_2 = get_arm_boundaries(body_mask_orig, pt_orig, dir_orig)
                edge_gen_1, edge_gen_2 = get_arm_boundaries(body_mask_gen, pt_gen, dir_gen)
                if edge_orig_1 is not None and edge_gen_1 is not None:
                    src_pts.append(list(edge_gen_1))
                    dst_pts.append(list(edge_orig_1))
                    src_pts.append(list(edge_gen_2))
                    dst_pts.append(list(edge_orig_2))

            # Right Arm Lower (Elbow to Wrist)
            for pct in [0.5, 1.0]: # Forearm and Wrist
                pt_orig = orig_14 * (1.0 - pct) + orig_16 * pct
                pt_gen = gen_14 * (1.0 - pct) + gen_16 * pct
                dir_orig = orig_16 - orig_14
                dir_gen = gen_16 - gen_14
                edge_orig_1, edge_orig_2 = get_arm_boundaries(body_mask_orig, pt_orig, dir_orig)
                edge_gen_1, edge_gen_2 = get_arm_boundaries(body_mask_gen, pt_gen, dir_gen)
                if edge_orig_1 is not None and edge_gen_1 is not None:
                    src_pts.append(list(edge_gen_1))
                    dst_pts.append(list(edge_orig_1))
                    src_pts.append(list(edge_gen_2))
                    dst_pts.append(list(edge_orig_2))

        # 4. Bottom Hem Alignment to Hip Curve (sample 5 points along the hem at hip level)
        if body_mask_orig is not None and body_mask_gen is not None:
            x_l_orig_hip, x_r_orig_hip = get_body_boundaries_at_y(body_mask_orig, y_hip, int(orig_sh_center[0]))
            x_l_gen_hip, x_r_gen_hip = get_body_boundaries_at_y(body_mask_gen, y_hip_gen, int(gen_sh_center[0]))
            if x_l_orig_hip is not None and x_l_gen_hip is not None:
                for pct_x in [0.0, 0.25, 0.50, 0.75, 1.0]:
                    orig_x = int(x_l_orig_hip + pct_x * (x_r_orig_hip - x_l_orig_hip))
                    gen_x = int(x_l_gen_hip + pct_x * (x_r_gen_hip - x_l_gen_hip))
                    src_pts.append([gen_x, y_hip_gen])
                    dst_pts.append([orig_x, y_hip])

        # 4. Jaw-mouth-chin based Collar Alignment Placement
        pt_mouth_orig = (get_pt_orig(9) + get_pt_orig(10)) / 2.0
        pt_mouth_gen = (get_pt_gen(9) + get_pt_gen(10)) / 2.0
        pt_ears_orig = (get_pt_orig(7) + get_pt_orig(8)) / 2.0
        pt_ears_gen = (get_pt_gen(7) + get_pt_gen(8)) / 2.0
        
        head_height_orig = np.linalg.norm(get_pt_orig(0) - pt_ears_orig)
        head_height_gen = np.linalg.norm(get_pt_gen(0) - pt_ears_gen)
        
        chin_orig = pt_mouth_orig + np.array([0.0, 0.25 * head_height_orig])
        chin_gen = pt_mouth_gen + np.array([0.0, 0.25 * head_height_gen])
        
        orig_collar_y = chin_orig[1] + 0.45 * (orig_sh_center[1] - chin_orig[1])
        gen_collar_y = chin_gen[1] + 0.45 * (gen_sh_center[1] - chin_gen[1])
        
        collar_half_w = 0.32 * np.linalg.norm(orig_11 - orig_12) / 2.0
        gen_collar_half_w = 0.32 * np.linalg.norm(gen_11 - gen_12) / 2.0
        
        src_pts.append([gen_sh_center[0] - gen_collar_half_w, gen_collar_y])
        dst_pts.append([orig_sh_center[0] - collar_half_w, orig_collar_y])
        src_pts.append([gen_sh_center[0] + gen_collar_half_w, gen_collar_y])
        dst_pts.append([orig_sh_center[0] + collar_half_w, orig_collar_y])
        src_pts.append([gen_sh_center[0], gen_collar_y])
        dst_pts.append([orig_sh_center[0], orig_collar_y])
        
    src_pts = list(src_pts)
    dst_pts = list(dst_pts)
    
    # ─── Multi-Category Adjustments (Kurta/Dress extension down to knees) ───
    if m_orig and m_gen and category in ["kurta", "dress"] and len(l_orig) > 26 and len(l_gen) > 26:
        orig_25, orig_26 = get_pt_orig(25), get_pt_orig(26)
        gen_25, gen_26 = get_pt_gen(25), get_pt_gen(26)
        y_knee = int((orig_25[1] + orig_26[1]) / 2.0)
        y_knee_gen = int((gen_25[1] + gen_26[1]) / 2.0)
        y_thigh = int(y_hip + 0.5 * (y_knee - y_hip))
        y_thigh_gen = int(y_hip_gen + 0.5 * (y_knee_gen - y_hip_gen))
        
        if y_thigh < h and y_thigh_gen < h:
            x_l_orig, x_r_orig = get_body_boundaries_at_y(body_mask_orig, y_thigh, int(orig_sh_center[0]))
            x_l_gen, x_r_gen = get_body_boundaries_at_y(body_mask_gen, y_thigh_gen, int(gen_sh_center[0]))
            if x_l_orig is not None and x_l_gen is not None:
                tol = profile["hip_tolerance"]
                target_l = int(x_l_orig + (x_l_gen - x_l_orig) * tol)
                target_r = int(x_r_orig + (x_r_gen - x_r_orig) * tol)
                src_pts.append([x_l_gen, y_thigh_gen])
                dst_pts.append([target_l, y_thigh])
                src_pts.append([x_r_gen, y_thigh_gen])
                dst_pts.append([target_r, y_thigh])
                
        if y_knee < h and y_knee_gen < h:
            x_l_orig, x_r_orig = get_body_boundaries_at_y(body_mask_orig, y_knee, int(orig_sh_center[0]))
            x_l_gen, x_r_gen = get_body_boundaries_at_y(body_mask_gen, y_knee_gen, int(gen_sh_center[0]))
            if x_l_orig is not None and x_l_gen is not None:
                tol = profile["hip_tolerance"]
                target_l = int(x_l_orig + (x_l_gen - x_l_orig) * tol)
                target_r = int(x_r_orig + (x_r_gen - x_r_orig) * tol)
                src_pts.append([x_l_gen, y_knee_gen])
                dst_pts.append([target_l, y_knee])
                src_pts.append([x_r_gen, y_knee_gen])
                dst_pts.append([target_r, y_knee])

    # 5. Stable Background Protection Anchors
    grid_rows = 12
    grid_cols = 12
    active_landmarks = [np.array(pt) for pt in dst_pts]
    min_bg_anchor_distance = 60.0
    
    for r in range(grid_rows):
        y_grid = int(r * (h - 1) / (grid_rows - 1))
        for c in range(grid_cols):
            x_grid = int(c * (w - 1) / (grid_cols - 1))
            is_bg_orig = body_mask_orig is None or body_mask_orig[y_grid, x_grid] < 127
            is_bg_gen = body_mask_gen is None or body_mask_gen[y_grid, x_grid] < 127
            if is_bg_orig and is_bg_gen:
                anchor_pt = np.array([x_grid, y_grid])
                too_close = False
                for lm_pt in active_landmarks:
                    if np.linalg.norm(anchor_pt - lm_pt) < min_bg_anchor_distance:
                        too_close = True
                        break
                if not too_close:
                    src_pts.append([x_grid, y_grid])
                    dst_pts.append([x_grid, y_grid])
                    
    # Add boundary anchors to keep outer frame edges fixed
    anchors = [
        [0, 0], [w-1, 0], [0, h-1], [w-1, h-1],
        [w//2, 0], [w//2, h-1], [0, h//2], [w-1, h//2]
    ]
    for pt in anchors:
        src_pts.append(pt)
        dst_pts.append(pt)
        
    src_pts = np.array(src_pts)
    dst_pts = np.array(dst_pts)
    
    # ─── Thin Plate Spline Warping ───
    grid_size = 64
    h_small = grid_size
    w_small = grid_size
    scale_x = w_small / w
    scale_y = h_small / h
    
    src_pts_small = src_pts.copy().astype(np.float32)
    src_pts_small[:, 0] *= scale_x
    src_pts_small[:, 1] *= scale_y
    
    dst_pts_small = dst_pts.copy().astype(np.float32)
    dst_pts_small[:, 0] *= scale_x
    dst_pts_small[:, 1] *= scale_y
    
    filtered_src_small = []
    filtered_dst_small = []
    min_dist_small = 1.5
    
    for s_pt, d_pt in zip(src_pts_small, dst_pts_small):
        too_close = False
        for existing in filtered_dst_small:
            if np.linalg.norm(d_pt - existing) < min_dist_small:
                too_close = True
                break
        if not too_close:
            filtered_src_small.append(s_pt)
            filtered_dst_small.append(d_pt)
            
    src_pts_small = np.array(filtered_src_small)
    dst_pts_small = np.array(filtered_dst_small)
    
    rbf_x = Rbf(dst_pts_small[:, 0], dst_pts_small[:, 1], src_pts_small[:, 0], function='thin_plate')
    rbf_y = Rbf(dst_pts_small[:, 0], dst_pts_small[:, 1], src_pts_small[:, 1], function='thin_plate')
    
    grid_y, grid_x = np.mgrid[0:h_small, 0:w_small]
    map_x_small = rbf_x(grid_x.flatten(), grid_y.flatten()).reshape(h_small, w_small).astype(np.float32)
    map_y_small = rbf_y(grid_x.flatten(), grid_y.flatten()).reshape(h_small, w_small).astype(np.float32)
    
    map_x_small /= scale_x
    map_y_small /= scale_y
    
    map_x = cv2.resize(map_x_small, (w, h), interpolation=cv2.INTER_LINEAR)
    map_y = cv2.resize(map_y_small, (w, h), interpolation=cv2.INTER_LINEAR)
    
    warped_gen = cv2.remap(gen_img, map_x, map_y, cv2.INTER_LINEAR)
    
    # Anti-stretch validation: clamp warp map to prevent distortion artifacts
    dx = np.diff(map_x, axis=1)
    dy = np.diff(map_y, axis=0)
    
    max_stretch_x = np.max(np.abs(dx)) if dx.size > 0 else 1.0
    max_stretch_y = np.max(np.abs(dy)) if dy.size > 0 else 1.0
    
    if max_stretch_x > 1.5 or max_stretch_y > 1.5:
        print(f"[BODY-PRESERVE] Anti-stretch: detected excessive stretch ({max_stretch_x:.2f}x, {max_stretch_y:.2f}y). Blending with identity map.")
        identity_x = np.arange(w, dtype=np.float32)[np.newaxis, :].repeat(h, axis=0)
        identity_y = np.arange(h, dtype=np.float32)[:, np.newaxis].repeat(w, axis=1)
        blend_factor = min(1.0, 1.5 / max(max_stretch_x, max_stretch_y))
        map_x = map_x * blend_factor + identity_x * (1.0 - blend_factor)
        map_y = map_y * blend_factor + identity_y * (1.0 - blend_factor)
        warped_gen = cv2.remap(gen_img, map_x, map_y, cv2.INTER_LINEAR)
    
    # Compute warped body segmentation mask to warp clothing boundaries
    body_mask_warped = np.zeros((h, w), dtype=np.uint8)
    if body_mask_gen is not None:
        body_mask_warped = cv2.remap(body_mask_gen, map_x, map_y, cv2.INTER_NEAREST)
        
    # Constrain the warped clothing mask to a slightly dilated version of the original body mask
    # to allow natural clothing drape and edges to blend smoothly without hard-clipping.
    if body_mask_orig is not None:
        body_mask_orig_dilated_clip = cv2.dilate(body_mask_orig, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        body_mask_warped = cv2.bitwise_and(body_mask_warped, body_mask_orig_dilated_clip)
        
    # ─── Soft Masking & Identity Preservation ───
    preservation_mask = np.zeros((h, w), dtype=np.uint8)
    skin_mask = get_skin_mask(orig_img)
    
    sh_center = np.array([(l_orig[11].x + l_orig[12].x) * w / 2.0, (l_orig[11].y + l_orig[12].y) * h / 2.0])
    hip_center = np.array([(l_orig[23].x + l_orig[24].x) * w / 2.0, (l_orig[23].y + l_orig[24].y) * h / 2.0])
    torso_height = np.linalg.norm(sh_center - hip_center)
    
    # 2. Neck region landmarks
    y_head_bottom = h * 0.2
    if len(l_orig) > 12:
        pt_nose = np.array([l_orig[0].x * w, l_orig[0].y * h])
        pt_11 = np.array([l_orig[11].x * w, l_orig[11].y * h])
        pt_12 = np.array([l_orig[12].x * w, l_orig[12].y * h])
        
        y_head_bottom = pt_nose[1] + 0.50 * (sh_center[1] - pt_nose[1])
        y_neck_start = int(y_head_bottom)
        y_neck_end = int(pt_nose[1] + 0.72 * (sh_center[1] - pt_nose[1]))
        
        collar_y_scan_val = y_neck_end
        cx = int(sh_center[0])
        consecutive_clothing = 0
        for y_scan in range(y_neck_start, y_neck_end):
            x1 = max(0, cx - 6)
            x2 = min(w, cx + 6)
            roi = skin_mask[y_scan, x1:x2]
            skin_ratio = np.mean(roi > 127)
            if skin_ratio < 0.25:
                consecutive_clothing += 1
                if consecutive_clothing >= 3:
                    collar_y_scan_val = y_scan - 2
                    break
            else:
                consecutive_clothing = 0
                
        y_collar = max(y_neck_start, collar_y_scan_val)
        neck_half_w = 0.25 * np.linalg.norm(pt_11 - pt_12) / 2.0
        
        neck_left_top = [int(sh_center[0] - neck_half_w), int(y_head_bottom)]
        neck_right_top = [int(sh_center[0] + neck_half_w), int(y_head_bottom)]
        neck_left_base = [int(sh_center[0] - neck_half_w * 1.15), int(y_collar)]
        neck_right_base = [int(sh_center[0] + neck_half_w * 1.15), int(y_collar)]
        
        neck_pts = np.array([neck_left_top, neck_right_top, neck_right_base, neck_left_base], dtype=np.int32)
        neck_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(neck_mask, [neck_pts], 255)
        
        neck_skin_mask = cv2.bitwise_and(neck_mask, skin_mask)
        preservation_mask = cv2.bitwise_or(preservation_mask, neck_skin_mask)
        
    # Face bounding box with 45% width, 75% height padding
    if len(l_orig) > 10:
        head_pts_x = [l_orig[i].x * w for i in range(11)]
        head_pts_y = [l_orig[i].y * h for i in range(11)]
        min_x, max_x = min(head_pts_x), max(head_pts_x)
        min_y, max_y = min(head_pts_y), max(head_pts_y)
        head_w = max_x - min_x
        head_h = max_y - min_y
        pad_x = head_w * 0.45
        pad_y = head_h * 0.75
        face_box_x1 = max(0, int(min_x - pad_x))
        face_box_x2 = min(w, int(max_x + pad_x))
        face_box_y1 = max(0, int(min_y - pad_y))
        face_box_y2 = min(h, int(max_y + pad_y))
        preservation_mask[face_box_y1:face_box_y2, face_box_x1:face_box_x2] = 255
        
    if body_mask_orig is not None:
        head_mask = np.copy(body_mask_orig)
        head_mask[int(y_head_bottom):, :] = 0
        preservation_mask = cv2.bitwise_or(preservation_mask, head_mask)
    else:
        head_pts = []
        for i in range(0, 11):
            if i < len(l_orig):
                head_pts.append([int(l_orig[i].x * w), int(l_orig[i].y * h)])
        for i in [7, 8]:
            if i < len(l_orig):
                head_pts.append([int(l_orig[i].x * w), int(l_orig[i].y * h)])
        if len(head_pts) > 0:
            hull = cv2.convexHull(np.array(head_pts))
            cv2.drawContours(preservation_mask, [hull], -1, 255, -1)
            
    hand_radius = max(12, int(torso_height * 0.08))
    hands_mask = np.zeros((h, w), dtype=np.uint8)
    
    left_hand_pts = []
    left_indices = [17, 19, 21]
    if is_short_sleeve:
        left_indices.extend([13, 15])
    for idx in left_indices:
        if idx < len(l_orig):
            pt = [int(l_orig[idx].x * w), int(l_orig[idx].y * h)]
            left_hand_pts.append(pt)
            cv2.circle(hands_mask, tuple(pt), hand_radius, 255, -1)
    if len(left_hand_pts) > 0:
        hull_l = cv2.convexHull(np.array(left_hand_pts))
        cv2.drawContours(hands_mask, [hull_l], -1, 255, -1)
        
    right_hand_pts = []
    right_indices = [18, 20, 22]
    if is_short_sleeve:
        right_indices.extend([14, 16])
    for idx in right_indices:
        if idx < len(l_orig):
            pt = [int(l_orig[idx].x * w), int(l_orig[idx].y * h)]
            right_hand_pts.append(pt)
            cv2.circle(hands_mask, tuple(pt), hand_radius, 255, -1)
    if len(right_hand_pts) > 0:
        hull_r = cv2.convexHull(np.array(right_hand_pts))
        cv2.drawContours(hands_mask, [hull_r], -1, 255, -1)
        
    # Directly preserve hand regions (without skin mask filter)
    preservation_mask = cv2.bitwise_or(preservation_mask, hands_mask)
    
    preservation_mask_blur = cv2.GaussianBlur(preservation_mask, (15, 15), 0)
    w_preservation = preservation_mask_blur.astype(float) / 255.0
    w_preservation = np.expand_dims(w_preservation, axis=2)
    
    # ─── Warped Garment Blending ───
    # Enhance fabric details using LAB space contrast enhancer
    warped_gen = enhance_fabric_details(warped_gen, body_mask_warped)
    
    body_mask_warped_blur = cv2.GaussianBlur(body_mask_warped.astype(np.float32) / 255.0, (5, 5), 0)
    w_body = np.expand_dims(body_mask_warped_blur, axis=2)
    
    w_body_final = (1.0 - w_preservation) * w_body
    
    # Overlay warped garment directly onto untouched original background image
    final_composite = (orig_img * (1.0 - w_body_final) + warped_gen * w_body_final).astype(np.uint8)
    return final_composite

async def preserve_body_shape_from_urls(
    orig_url: str,
    gen_url: str,
    garment_category: Optional[str] = None,
    garment_subcategory: Optional[str] = None,
    clothing_name: Optional[str] = None,
    clothing_description: Optional[str] = None
) -> str:
    """Download, process shape/identity preservation, and return a base64 try-on data URL."""
    print(f"[BODY-PRESERVE] Loading original image from: {orig_url[:90]}")
    print(f"[BODY-PRESERVE] Loading generated image from: {gen_url[:90]}")
    
    orig_img = await get_image_from_url_or_base64(orig_url)
    gen_img = await get_image_from_url_or_base64(gen_url)
    
    print(f"[BODY-PRESERVE] Processing shape and identity preservation for category: {garment_category}...")
    final_img = preserve_body_shape(
        orig_img,
        gen_img,
        garment_category=garment_category,
        garment_subcategory=garment_subcategory,
        clothing_name=clothing_name,
        clothing_description=clothing_description
    )
    
    # Convert back to base64 URL
    _, buffer = cv2.imencode(".png", final_img)
    base64_str = base64.b64encode(buffer).decode("utf-8")
    
    return f"data:image/png;base64,{base64_str}"
