import os
import asyncio
import httpx
from urllib.parse import urlparse

async def run_replicate_try_on(
    user_image_url: str,
    clothing_image_url: str,
    description: str = None,
    garment_category: str = None
) -> str:
    print("[DEBUG-REPLICATE] Verifying REPLICATE_API_TOKEN presence...")
    token = (os.getenv("REPLICATE_API_TOKEN") or "").strip()
    print("[DEBUG-REPLICATE] REPLICATE_API_TOKEN exists:", bool(token))
    
    if not token:
        raise ValueError("Replicate API Token (REPLICATE_API_TOKEN) is not configured in your backend .env file.")
        
    print("[DEBUG-VALIDATION] Validating image URLs for Replicate...")
    print("[DEBUG-VALIDATION] Human Image URL:", user_image_url)
    print("[DEBUG-VALIDATION] Garment Image URL:", clothing_image_url)
    
    def allow_http_local_or_data(url_str: str) -> bool:
        if url_str and url_str.startswith("data:"):
            return True
        try:
            parsed = urlparse(url_str)
            return (
                parsed.scheme == "https" or
                (parsed.scheme == "http" and (parsed.hostname == "localhost" or parsed.hostname == "127.0.0.1"))
            )
        except Exception:
            return False
            
    if not allow_http_local_or_data(user_image_url):
        raise ValueError(f"Human image URL must be an HTTPS or Data URL. Got: {user_image_url[:50]}...")
    if not allow_http_local_or_data(clothing_image_url):
        raise ValueError(f"Clothing image URL must be an HTTPS or Data URL. Got: {clothing_image_url[:50]}...")
        
    # Determine Replicate category from garment_category parameter
    replicate_category = "upper_body"  # default
    cat = (garment_category or "").lower()
    if cat in ["pant", "pants", "jeans", "shorts", "trousers", "joggers"]:
        replicate_category = "lower_body"
    elif cat in ["dress", "dresses", "kurta", "gown", "maxi"]:
        replicate_category = "dresses"
    
    # Generate descriptive fallback instead of hardcoded garment
    fallback_desc = "A fashion garment"
    if cat:
        fallback_desc = f"A {cat.replace('_', ' ')} garment"
    
    payload = {
        "version": "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
        "input": {
            "human_img": user_image_url,
            "garm_img": clothing_image_url,
            "garment_des": description or fallback_desc,
            "category": replicate_category,
            "crop": True,
            "num_inference_steps": 30,
            "guidance_scale": 2.5,
            "seed": 42
        }
    }
    
    print("[DEBUG-REPLICATE] Sending request to Replicate predictions endpoint...")
    
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json=payload
        )
        
        print("[DEBUG-REPLICATE] Prediction dispatch response status:", response.status_code)
        
        if response.status_code not in [200, 201]:
            try:
                err_data = response.json()
            except Exception:
                err_data = {}
            print("[DEBUG-REPLICATE] Prediction dispatch failed. Error response:", err_data)
            detail = err_data.get("detail", f"Replicate API Error (HTTP {response.status_code})")
            raise ValueError(detail)
            
        prediction = response.json()
        prediction_id = prediction["id"]
        print(f"[DEBUG-REPLICATE] Prediction successfully created! ID: {prediction_id}")
        
        # Poll for completion (max 2 minutes, polling every 3 seconds)
        max_attempts = 40
        print("[DEBUG-REPLICATE] Starting polling pipeline...")
        
        for i in range(max_attempts):
            print(f"[DEBUG-REPLICATE] Polling check {i + 1}/{max_attempts}...")
            await asyncio.sleep(3.0)
            
            poll_response = await client.get(
                f"https://api.replicate.com/v1/predictions/{prediction_id}",
                headers={"Authorization": f"Token {token}"}
            )
            
            if poll_response.status_code != 200:
                print(f"[DEBUG-REPLICATE] Warning: Failed to fetch prediction status (HTTP {poll_response.status_code}), retrying...")
                continue
                
            prediction = poll_response.json()
            status = prediction.get("status")
            print(f"[DEBUG-REPLICATE] Status update: '{status}'")
            
            if prediction.get("error"):
                print("[DEBUG-REPLICATE] Prediction reported error:", prediction["error"])
                
            if status == "succeeded":
                output = prediction.get("output")
                print("[DEBUG-REPLICATE] Prediction succeeded! Raw Output:", output)
                
                final_url = ""
                if isinstance(output, list) and len(output) > 0:
                    final_url = output[0]
                elif isinstance(output, str):
                    final_url = output
                    
                if not final_url:
                    raise ValueError("Prediction succeeded but output URL was empty or invalid.")
                    
                print("[DEBUG-REPLICATE] Verified generated image URL:", final_url)
                return final_url
            elif status == "failed":
                raise ValueError(f"Replicate VTON failed: {prediction.get('error', 'Check Replicate dashboard logs.')}")
            elif status == "canceled":
                raise ValueError("Replicate VTON prediction was canceled by the server.")
                
        raise TimeoutError("Replicate prediction polling timed out after 2 minutes. Please try again.")
