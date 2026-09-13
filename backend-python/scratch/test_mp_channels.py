import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

async def test():
    os.makedirs("temp_images", exist_ok=True)
    files = [f for f in os.listdir("temp_images") if f.endswith((".png", ".jpg", ".jpeg"))]
    if not files:
        img = np.zeros((1024, 768, 3), dtype=np.uint8)
        cv2.imwrite("temp_images/mock.jpg", img)
        file_path = "temp_images/mock.jpg"
    else:
        file_path = os.path.join("temp_images", files[0])
        
    print(f"Loading test image: {file_path}")
    orig_img = cv2.imread(file_path)
    # Simulate a generated PNG that is RGBA but converted to RGB
    gen_img = np.zeros((orig_img.shape[0], orig_img.shape[1], 4), dtype=np.uint8)
    gen_img[:, :, :3] = orig_img
    gen_img[:, :, 3] = 255 # alpha channel
    
    print(f"Orig shape: {orig_img.shape}, dtype: {orig_img.dtype}")
    print(f"Gen shape: {gen_img.shape}, dtype: {gen_img.dtype}")
    
    MODEL_PATH = "pose_landmarker.task"
    base_options = mp_tasks.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=True
    )
    
    landmarker = vision.PoseLandmarker.create_from_options(options)
    
    # ── MediaPipe processing as in body_preservation_service.py ──
    # MediaPipe requires RGB images (exactly 3 channels)
    if len(orig_img.shape) == 2:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_GRAY2RGB)
    elif orig_img.shape[2] == 4:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGRA2RGB)
    else:
        orig_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGR2RGB)
    
    if len(gen_img.shape) == 2:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_GRAY2RGB)
    elif gen_img.shape[2] == 4:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_BGRA2RGB)
        gen_img_3ch = cv2.cvtColor(gen_img, cv2.COLOR_BGRA2BGR)
    else:
        gen_rgb = cv2.cvtColor(gen_img, cv2.COLOR_BGR2RGB)
        
    print(f"orig_rgb dtype: {orig_rgb.dtype}, gen_rgb dtype: {gen_rgb.dtype}")
    
    mp_orig = mp.Image(image_format=mp.ImageFormat.SRGB, data=orig_rgb)
    mp_gen = mp.Image(image_format=mp.ImageFormat.SRGB, data=gen_rgb)
    
    print("Detecting orig...")
    res_orig = landmarker.detect(mp_orig)
    print("Detecting gen...")
    res_gen = landmarker.detect(mp_gen)
    print("Finished both successfully!")

if __name__ == "__main__":
    asyncio.run(test())
