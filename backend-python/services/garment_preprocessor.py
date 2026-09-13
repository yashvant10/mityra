"""Garment preprocessor service.
Automatically removes product background (white, beige, gray studio backgrounds)
and extracts clean garment as transparent PNG before sending to any AI engine.
"""

import cv2
import numpy as np
import base64
import asyncio
import httpx
import re

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
    
    # Exclude clothing-like bright saturated colors that might overlap with skin hue
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]
    clothing_mask = (s > 115) & (v > 35)
    skin_mask[clothing_mask] = 0
    
    # Morphological clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
    skin_mask = cv2.dilate(skin_mask, kernel, iterations=2)
    return skin_mask

def erase_face_and_neck(img: np.ndarray, alpha_mask: np.ndarray) -> np.ndarray:
    """Detect faces and zero out everything in and above the face (head, hair, neck)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
        for (x, y, w_face, h_face) in faces:
            # Erase the face and everything directly above it (hair) and slightly below (neck)
            erase_y_start = max(0, y - int(h_face * 1.5))
            erase_y_end = min(img.shape[0], y + int(h_face * 1.8))
            erase_x_start = max(0, x - int(w_face * 0.5))
            erase_x_end = min(img.shape[1], x + int(w_face * 1.5))
            alpha_mask[erase_y_start:erase_y_end, erase_x_start:erase_x_end] = 0
    except Exception as e:
        print(f"[GARMENT-PREP] Face detection failed: {e}")
    return alpha_mask

async def prepare_clean_garment_url(clothing_image_url: str) -> str:
    """Download/decode clothing image, completely remove product model and background,
    and return a clean transparent PNG data URL containing ONLY the garment.
    """
    if not clothing_image_url:
        return clothing_image_url

    try:
        # 1. Fetch / decode image bytes
        img_bytes = None
        if clothing_image_url.startswith("data:"):
            match = re.match(r"^data:([^;]+);base64,(.+)$", clothing_image_url)
            if match:
                img_bytes = base64.b64decode(match.group(2))
        else:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(clothing_image_url)
                if res.status_code == 200:
                    img_bytes = res.content

        if not img_bytes:
            print("[GARMENT-PREP] Could not fetch image bytes, returning original URL")
            return clothing_image_url

        nparr = np.frombuffer(img_bytes, np.uint8)
        cloth_img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        if cloth_img is None:
            return clothing_image_url

        h, w = cloth_img.shape[:2]

        # Extract BGR
        if len(cloth_img.shape) == 4:
            bgr = cloth_img[:, :, :3]
            alpha_orig = cloth_img[:, :, 3]
        elif len(cloth_img.shape) == 3:
            bgr = cloth_img
            alpha_orig = np.ones((h, w), dtype=np.uint8) * 255
        else:
            bgr = cv2.cvtColor(cloth_img, cv2.COLOR_GRAY2BGR)
            alpha_orig = np.ones((h, w), dtype=np.uint8) * 255

        # 2. Try advanced segmentation (rembg with u2net_cloth_seg)
        clean_mask = None
        try:
            import rembg
            # Use cloth segmentation model to isolate just the clothing
            session = await asyncio.to_thread(rembg.new_session, "u2net_cloth_seg")
            # rembg.remove expects image bytes or PIL Image, passing BGR needs conversion or we pass original bytes
            output_bytes = await asyncio.to_thread(rembg.remove, img_bytes, session=session)
            nparr_out = np.frombuffer(output_bytes, np.uint8)
            rembg_img = cv2.imdecode(nparr_out, cv2.IMREAD_UNCHANGED)
            if rembg_img is not None and len(rembg_img.shape) == 4:
                clean_mask = rembg_img[:, :, 3]
                print("[GARMENT-PREP] Successfully applied rembg u2net_cloth_seg")
        except Exception as e:
            print(f"[GARMENT-PREP] rembg segmentation failed or not available, falling back to thresholding: {e}")

        # Fallback to thresholding if rembg failed
        if clean_mask is None:
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            border_sample = np.concatenate([
                gray[0:10, :].flatten(), gray[-10:, :].flatten(),
                gray[:, 0:10].flatten(), gray[:, -10:].flatten()
            ])
            edge_mean = float(np.mean(border_sample))
            edge_std = float(np.std(border_sample))

            clean_mask = np.ones((h, w), dtype=np.uint8) * 255
            if edge_mean > 175 and edge_std < 40:
                thresh_val = max(int(edge_mean - max(25, edge_std * 1.5)), 160)
                _, bg_mask = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)
                clean_mask = cv2.bitwise_not(bg_mask)
            elif edge_mean < 60 and edge_std < 30:
                thresh_val = min(int(edge_mean + max(25, edge_std * 1.5)), 90)
                _, clean_mask = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)

        # 3. Explicitly erase Product Model Face and Skin
        # Detect and erase face/head/neck
        clean_mask = erase_face_and_neck(bgr, clean_mask)
        
        # Detect and subtract skin (hands, arms, legs)
        skin_mask = get_skin_mask(bgr)
        clean_mask[skin_mask > 127] = 0

        # Clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, kernel)
        
        # Keep only the largest connected components (remove floating noise)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(clean_mask, connectivity=8)
        if num_labels > 1:
            max_area = 0
            largest_label = 1
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] > max_area:
                    max_area = stats[i, cv2.CC_STAT_AREA]
                    largest_label = i
            # Keep anything larger than 10% of the largest component
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] < max_area * 0.1:
                    clean_mask[labels == i] = 0

        # Ensure mask isn't completely empty
        if np.sum(clean_mask > 127) < (h * w * 0.05):
            print("[GARMENT-PREP] Mask too small after processing, keeping original alpha")
            clean_mask = alpha_orig

        # Smooth alpha edge
        alpha_channel = cv2.GaussianBlur(clean_mask, (5, 5), 0)

        # 4. Construct 4-channel BGRA image
        bgra = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
        bgra[:, :, 3] = alpha_channel

        # 5. Preserve original aspect ratio and padding to maintain coordinate scaling for VTON models
        # Do not crop to bounding box, as it breaks the scale ratio
        max_dim = max(w, h)
        if max_dim > 1024:
            scale = 1024.0 / max_dim
            new_w, new_h = int(w * scale), int(h * scale)
            bgra = cv2.resize(bgra, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

        _, png_buf = cv2.imencode(".png", bgra)
        b64_clean = base64.b64encode(png_buf.tobytes()).decode("utf-8")
        print("[GARMENT-PREP] Successfully isolated garment (model/background removed)")
        return f"data:image/png;base64,{b64_clean}"

    except Exception as e:
        print(f"[GARMENT-PREP] Error processing garment image: {e}")
        return clothing_image_url
