import os
import base64
import json
import re
import asyncio
import httpx
from typing import Dict, Optional, Tuple, Any

IMAGE_GEN_MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview"
]

ANALYSIS_MODEL = "gemini-2.5-flash"

async def get_base64_from_url(url: str) -> Dict[str, str]:
    if url.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.+)$", url)
        if match:
            return {"base64": match.group(2), "mimeType": match.group(1)}
            
    if "127.0.0.1" in url or "localhost" in url or "/api/tryon/image/" in url:
        match = re.search(r"/image/([a-f0-9-]+)", url)
        if match:
            img_id = match.group(1)
            for ext in ["png", "jpg", "jpeg"]:
                path = os.path.join("temp_images", f"{img_id}.{ext}")
                if os.path.exists(path):
                    with open(path, "rb") as f:
                        img_bytes = f.read()
                    mime_type = "image/png" if ext == "png" else "image/jpeg"
                    return {"base64": base64.b64encode(img_bytes).decode("utf-8"), "mimeType": mime_type}
            
    print(f"[GEMINI] Fetching image from: {url}")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch image (HTTP {response.status_code}): {url}")
        mime_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
        base64_str = base64.b64encode(response.content).decode("utf-8")
        return {"base64": base64_str, "mimeType": mime_type}

async def try_image_generation(
    api_key: str,
    prompt: str,
    user_data: Dict[str, str],
    clothing_data: Dict[str, str]
) -> Optional[str]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        for model_id in IMAGE_GEN_MODELS:
            try:
                print(f"[GEMINI] Trying image generation model: {model_id}")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": user_data["mimeType"], "data": user_data["base64"]}},
                            {"inlineData": {"mimeType": clothing_data["mimeType"], "data": clothing_data["base64"]}}
                        ]
                    }],
                    "generationConfig": {"responseModalities": ["IMAGE", "TEXT"], "temperature": 1.0}
                }
                
                res = await client.post(url, headers={"Content-Type": "application/json"}, params={"key": api_key}, json=payload)
                if res.status_code != 200:
                    print(f"[GEMINI] {model_id} failed (HTTP {res.status_code}): {res.text[:200]}")
                    if res.status_code == 429 or "quota" in res.text.lower():
                        print("[GEMINI] Quota exceeded or 429 rate limit hit. Aborting further image generation attempts to save time.")
                        break
                    continue
                    
                json_data = res.json()
                try:
                    parts = json_data["candidates"][0]["content"]["parts"]
                    for part in parts:
                        if "inlineData" in part and "data" in part["inlineData"]:
                            mime = part["inlineData"].get("mimeType", "image/png")
                            data = part["inlineData"]["data"]
                            print(f"[GEMINI] [SUCCESS] {model_id} generated image!")
                            return f"data:{mime};base64,{data}"
                except Exception:
                    pass
            except Exception as e:
                print(f"[GEMINI] {model_id} error: {str(e)[:150]}")
    return None

async def detect_body_landmarks(
    api_key: str,
    user_data: Dict[str, str],
    clothing_data: Dict[str, str],
    clothing_desc: str
) -> Dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{ANALYSIS_MODEL}:generateContent"
    
    prompt = f"""You are an expert body pose estimation AI for a virtual try-on system.

I am providing TWO images:
- IMAGE 1: A photo of a person (user photo)
- IMAGE 2: A clothing garment ({clothing_desc})

YOUR TASK: Analyze IMAGE 1 and detect the person's body landmarks. Return coordinates as PERCENTAGE values (0-100) relative to the full image width and height.

Think step by step:
1. Find the person's chin/jaw bottom — this is the BOTTOM of the face
2. Find the left shoulder edge and right shoulder edge
3. Find the base of the neck (where neck meets shoulders)
4. Find the waist/hip level
5. Determine how the clothing from IMAGE 2 should be placed

Return a JSON object with these EXACT fields:

{{
  "chinBottomY": <number 0-100, Y% of the chin/jaw bottom - clothing must START BELOW this>,
  "neckBaseY": <number 0-100, Y% where neck meets the shoulders>,
  "leftShoulderX": <number 0-100, X% of the LEFT shoulder outer edge>,
  "rightShoulderX": <number 0-100, X% of the RIGHT shoulder outer edge>,
  "leftShoulderY": <number 0-100, Y% of the left shoulder>,
  "rightShoulderY": <number 0-100, Y% of the right shoulder>,
  "chestCenterX": <number 0-100, X% center of the chest>,
  "chestCenterY": <number 0-100, Y% center of the chest>,
  "waistY": <number 0-100, Y% of the waist/belt line>,
  "waistLeftX": <number 0-100, X% of the left waist edge>,
  "waistRightX": <number 0-100, X% of the right waist edge>,
  "bodyTiltDegrees": <number -10 to 10, body rotation in degrees, 0 = upright>,
  "garmentType": "tshirt" | "shirt" | "polo" | "hoodie" | "jacket" | "sweater" | "tank_top" | "other",
  "isUpperBody": true,
  "hasCollar": <boolean>,
  "personFacing": "front" | "slight_left" | "slight_right" | "side",
  "backgroundComplexity": "simple" | "moderate" | "complex"
}}

CRITICAL RULES:
- chinBottomY MUST be ABOVE neckBaseY (chinBottomY < neckBaseY in image coordinates where 0=top)
- neckBaseY MUST be ABOVE or AT leftShoulderY/rightShoulderY
- The clothing MUST be placed BELOW chinBottomY to NEVER cover the face
- leftShoulderX should be LESS than rightShoulderX (left side of image)
- All values are percentages (0-100) of the full image dimensions
- 0,0 is the TOP-LEFT corner of the image
- Return ONLY the raw JSON, no markdown, no code blocks, no explanation"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": user_data["mimeType"], "data": user_data["base64"]}},
                {"inlineData": {"mimeType": clothing_data["mimeType"], "data": clothing_data["base64"]}}
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192}
    }
    
    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(url, headers={"Content-Type": "application/json"}, params={"key": api_key}, json=payload)
        if res.status_code != 200:
            raise ValueError(f"Gemini body analysis failed (HTTP {res.status_code}): {res.text[:200]}")
            
        json_data = res.json()
        text = json_data["candidates"][0]["content"]["parts"][0]["text"]
        print("[GEMINI] Body landmark response:", text)
        
        try:
            json_match = re.search(r"\{[\s\S]*\}", text)
            if not json_match:
                raise ValueError("No JSON structure found in model response")
            positioning = json.loads(json_match.group(0))
            
            # Fix coordinates
            if "neckBaseY" in positioning and "chinBottomY" in positioning:
                if positioning["neckBaseY"] < positioning["chinBottomY"]:
                    positioning["neckBaseY"], positioning["chinBottomY"] = positioning["chinBottomY"], positioning["neckBaseY"]
                    
            if "leftShoulderY" in positioning and "neckBaseY" in positioning:
                positioning["leftShoulderY"] = max(positioning["leftShoulderY"], positioning["neckBaseY"])
                positioning["rightShoulderY"] = max(positioning.get("rightShoulderY") or positioning["leftShoulderY"], positioning["neckBaseY"])
                
            return {"analysis": text, "positioning": positioning}
        except Exception:
            print("[GEMINI] Failed to parse landmarks, using safe defaults")
            return {
                "analysis": text,
                "positioning": {
                    "chinBottomY": 28,
                    "neckBaseY": 32,
                    "leftShoulderX": 25,
                    "rightShoulderX": 75,
                    "leftShoulderY": 34,
                    "rightShoulderY": 34,
                    "chestCenterX": 50,
                    "chestCenterY": 45,
                    "waistY": 65,
                    "waistLeftX": 30,
                    "waistRightX": 70,
                    "bodyTiltDegrees": 0,
                    "garmentType": "tshirt",
                    "isUpperBody": True,
                    "hasCollar": False,
                    "personFacing": "front",
                    "backgroundComplexity": "moderate"
                }
            }

async def generate_gemini_try_on(
    user_image_url: str,
    clothing_image_url: str,
    custom_description: str = None
) -> str:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("Gemini API Key is not configured.")
        
    print("[GEMINI] Downloading user and clothing images...")
    user_data, clothing_data = await asyncio.gather(
        get_base64_from_url(user_image_url),
        get_base64_from_url(clothing_image_url)
    )
    print("[GEMINI] Images downloaded.")
    
    clothing_desc = custom_description or "the clothing item shown in the second image"
    
    # 1. Real Image Gen
    prompt = (f"VIRTUAL TRY-ON — Generate a single photorealistic image of this person wearing this exact garment.\n\n"
              f"GARMENT: {clothing_desc}\n\n"
              f"INSTRUCTIONS:\n"
              f"1. Dress the person in Image 1 with the EXACT garment from Image 2.\n"
              f"2. The garment must be WORN ON the body naturally — NOT overlaid as a floating box or rectangle.\n"
              f"3. REMOVE any background from the garment image. Only the fabric/clothing should appear on the person.\n"
              f"4. The garment must follow the person's body shape, pose, and proportions exactly.\n"
              f"5. Keep the person's face, hair, skin, hands, and background IDENTICAL to the original.\n"
              f"6. Add realistic fabric folds, shadows, and lighting that match the original photo.\n"
              f"7. Garment edges must blend seamlessly — NO rectangular borders, NO white/beige background boxes, NO cut-paste artifacts.\n"
              f"8. The result must look like a real photograph, not a digital overlay.\n\n"
              f"Output ONLY the final photorealistic image. No text, no watermarks.")
    print("[GEMINI] Attempting AI image generation...")
    generated = await try_image_generation(api_key, prompt, user_data, clothing_data)
    if generated:
        return generated
        
    # If image generation failed, raise an explicit error instead of falling back to a pasted box
    raise ValueError("Gemini AI Engine is currently busy or rate limited (Quota Exceeded). Please try again later.")

async def analyse_face_with_gemini(face_image_url: str) -> Dict[str, Any]:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    
    default_profile = {
        "skinTone": "Wheatish warm",
        "faceShape": "Oval",
        "ageGroup": "20s",
        "gender": "male",
        "recommendedColors": ["Navy", "Maroon", "Olive", "Cream"],
        "recommendedStyles": ["Slim fit", "V-neck", "Kurta"],
        "avoidColors": ["Neon Orange", "Lime Green"],
        "personalityStyle": "Smart Casual"
    }
    
    if not api_key:
        print("[GEMINI] API key missing, returning fallback styling profile.")
        return default_profile
        
    try:
        print("[GEMINI] Downloading face image...")
        face_data = await get_base64_from_url(face_image_url)
        print("[GEMINI] Face image downloaded.")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{ANALYSIS_MODEL}:generateContent"
        
        prompt = """Analyse this person's face. Identify:
1. Skin tone (fair/medium/wheatish/dark)
2. Face shape (oval/round/square/heart)
3. Estimated age group (teen/20s/30s/40s+)
4. Gender

Based on these, suggest best outfit colors, styles and types that would suit this person. Return as JSON:
{
  "skinTone": "Skin tone name (e.g. Wheatish warm)",
  "faceShape": "Face shape name (e.g. Oval)",
  "ageGroup": "Estimated age group (e.g. 20s)",
  "gender": "Estimated gender (e.g. male or female)",
  "recommendedColors": ["Color 1", "Color 2", "Color 3", "Color 4"],
  "recommendedStyles": ["Style 1", "Style 2", "Style 3"],
  "avoidColors": ["Color 1", "Color 2"],
  "personalityStyle": "Personality Style vibe (e.g. Smart Casual)"
}

Return ONLY the raw JSON block. No markdown, no code blocks, no other text."""

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": face_data["mimeType"], "data": face_data["base64"]}}
                ]
            }],
            "generationConfig": {"temperature": 0.2}
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers={"Content-Type": "application/json"}, params={"key": api_key}, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Gemini face analysis failed (HTTP {res.status_code}): {res.text[:200]}")
                
            json_data = res.json()
            text = json_data["candidates"][0]["content"]["parts"][0]["text"]
            print("[GEMINI] Face analysis response:", text)
            
            json_match = re.search(r"\{[\s\S]*\}", text)
            if not json_match:
                raise ValueError("No JSON structure found in model response")
            return json.loads(json_match.group(0))
    except Exception as e:
        print(f"[GEMINI] Face analysis failed, using fallback profile: {str(e)}")
        return default_profile

async def generate_gemini_compositing(
    user_image_url: str,
    clothing_image_url: str,
    custom_description: str = None
) -> str:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    
    default_positioning = {
        "chinBottomY": 28,
        "neckBaseY": 32,
        "leftShoulderX": 25,
        "rightShoulderX": 75,
        "leftShoulderY": 34,
        "rightShoulderY": 34,
        "chestCenterX": 50,
        "chestCenterY": 45,
        "waistY": 65,
        "waistLeftX": 30,
        "waistRightX": 70,
        "bodyTiltDegrees": 0,
        "garmentType": "tshirt",
        "isUpperBody": True,
        "hasCollar": False,
        "personFacing": "front",
        "backgroundComplexity": "moderate"
    }

    if not api_key:
        print("[GEMINI-FAST] API key missing, generating safe default compositing landmarks.")
        compositing_data = {
            "type": "ai_compositing",
            "userImageUrl": user_image_url,
            "clothingImageUrl": clothing_image_url,
            "positioning": default_positioning
        }
        b64 = base64.b64encode(json.dumps(compositing_data).encode("utf-8")).decode("utf-8")
        return f"data:application/json;base64,{b64}"
        
    try:
        print("[GEMINI-FAST] Downloading user and clothing images...")
        user_data, clothing_data = await asyncio.gather(
            get_base64_from_url(user_image_url),
            get_base64_from_url(clothing_image_url)
        )
        
        clothing_desc = custom_description or "the clothing item shown in the second image"
        
        # 1. Run body landmark detection directly for fast compositing
        print("[GEMINI-FAST] Running body landmark detection...")
        res = await detect_body_landmarks(api_key, user_data, clothing_data, clothing_desc)
        positioning = res["positioning"]
    except Exception as e:
        print(f"[GEMINI-FAST] Landmark detection failed, using fallback defaults: {str(e)}")
        positioning = default_positioning
    
    compositing_data = {
        "type": "ai_compositing",
        "userImageUrl": user_image_url,
        "clothingImageUrl": clothing_image_url,
        "positioning": positioning
    }
    
    b64 = base64.b64encode(json.dumps(compositing_data).encode("utf-8")).decode("utf-8")
    return f"data:application/json;base64,{b64}"


async def analyse_body_with_gemini(image_url: str) -> Dict[str, Any]:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")
        
    image_data = await get_base64_from_url(image_url)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{ANALYSIS_MODEL}:generateContent"
    
    prompt = """Analyze this image of a person for body measurement and fashion sizing profile.
    
    1. Validation rules:
       - The image must contain a person.
       - The person must be standing and fully visible (at least upper body, preferably full body).
       - The pose should be front-facing (or close to front-facing) to determine proportions.
       - The pose and clothing should allow estimating dimensions.
       - There must not be severe occlusion or poor lighting that prevents size analysis.
       
    2. Size estimation guidelines:
       - Estimate height category relative to average standards: "tall", "average", "petite".
       - Determine body type shape: "Athletic", "Oval", "Rectangle", "Hourglass", "Triangle", or "Inverted Triangle".
       - Determine recommended shirt size: "S", "M", "L", "XL", "XXL", "XXXL".
       - Estimate trouser/waist size in inches (e.g. "30", "32", "34", "36", "38").
       - Suggest the best fit style: "Slim fit", "Regular fit", "Loose fit".
       - Provide standard fit preferences and 3 tailored style recommendations based on their body type.
       
    Return ONLY a raw JSON object with this exact structure (no markdown, no code blocks):
    {
      "isValidPose": true,
      "validationError": null,
      "heightCategory": "tall",
      "bodyType": "Athletic",
      "shirtSize": "L",
      "trouser": "32",
      "bestFit": "Slim fit",
      "fitPreference": "Slim fit",
      "styleRecommendations": ["Style 1", "Style 2", "Style 3"],
      "confidenceScore": 0.95
    }
    
    If the image does not satisfy the validation rules (e.g. it is not a person, not standing, or poorly lit/obscured), set "isValidPose" to false and fill "validationError" with a descriptive error message (e.g., 'The image must contain a person standing front-facing.'). All other sizing fields can be null in that case."""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": image_data["mimeType"], "data": image_data["base64"]}}
            ]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, headers={"Content-Type": "application/json"}, params={"key": api_key}, json=payload)
        if res.status_code != 200:
            raise ValueError(f"Gemini vision body analysis failed (HTTP {res.status_code}): {res.text[:200]}")
            
        json_data = res.json()
        text = json_data["candidates"][0]["content"]["parts"][0]["text"]
        print("[GEMINI] Body analysis response:", text)
        
        json_match = re.search(r"\{[\s\S]*\}", text)
        if not json_match:
            raise ValueError("No JSON structure found in Gemini body analysis response")
        return json.loads(json_match.group(0))
