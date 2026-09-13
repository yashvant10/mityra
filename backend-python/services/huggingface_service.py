# -*- coding: utf-8 -*-
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

import os
import io
import base64
import re
import asyncio
import httpx
from typing import Dict, Optional, Tuple
from PIL import Image as PILImage

# Shared connection pool for HuggingFace requests
_hf_client: Optional[httpx.AsyncClient] = None

async def get_hf_client() -> httpx.AsyncClient:
    global _hf_client
    if _hf_client is None or _hf_client.is_closed:
        _hf_client = httpx.AsyncClient(
            timeout=httpx.Timeout(180.0, connect=15.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            follow_redirects=True
        )
    return _hf_client

MAX_IMAGE_DIMENSION = 1024
JPEG_QUALITY = 95
MAX_HEARTBEATS = 15  # ~3.75 minutes of queue heartbeats (allow HuggingFace queue to process)

def optimize_image_bytes(img_bytes: bytes, mime_type: str) -> tuple:
    """Resize and compress image before sending to HuggingFace to reduce upload time."""
    try:
        img = PILImage.open(io.BytesIO(img_bytes))
        original_size = len(img_bytes)
        
        # Resize if either dimension exceeds MAX_IMAGE_DIMENSION
        if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), PILImage.LANCZOS)
            print(f"[HF-OPT] Resized image to {img.width}x{img.height}")
        
        # Keep RGBA garments as PNG to preserve alpha channel and avoid JPEG artifacts
        if img.mode == 'RGBA':
            # Don't convert to JPEG — keep as PNG for better garment fidelity
            mime_type = 'image/png'
        
        # Compress to JPEG
        buffer = io.BytesIO()
        save_format = 'PNG' if 'png' in mime_type else 'JPEG'
        if save_format == 'JPEG':
            img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        else:
            img.save(buffer, format='PNG', optimize=True)
        
        optimized_bytes = buffer.getvalue()
        new_size = len(optimized_bytes)
        reduction = ((original_size - new_size) / original_size * 100) if original_size > 0 else 0
        print(f"[HF-OPT] Image optimized: {original_size//1024}KB → {new_size//1024}KB ({reduction:.0f}% reduction)")
        
        return optimized_bytes, mime_type
    except Exception as e:
        print(f"[HF-OPT] Image optimization failed (using original): {str(e)}")
        return img_bytes, mime_type

HF_SPACE_URL = "https://yisol-idm-vton.hf.space"

async def to_base64_data(input_str: str) -> Dict[str, str]:
    if input_str.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.+)$", input_str)
        if match:
            return {"base64": match.group(2), "mimeType": match.group(1)}
            
    if "127.0.0.1" in input_str or "localhost" in input_str or "/api/tryon/image/" in input_str:
        match = re.search(r"/image/([a-f0-9-]+)", input_str)
        if match:
            img_id = match.group(1)
            for ext in ["png", "jpg", "jpeg"]:
                path = os.path.join("temp_images", f"{img_id}.{ext}")
                if os.path.exists(path):
                    with open(path, "rb") as f:
                        img_bytes = f.read()
                    mime_type = "image/png" if ext == "png" else "image/jpeg"
                    return {"base64": base64.b64encode(img_bytes).decode("utf-8"), "mimeType": mime_type}
            
    client = await get_hf_client()
    response = await client.get(input_str, timeout=30.0)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch image (HTTP {response.status_code}): {input_str}")
    img_bytes = response.content
    mime_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
    base64_str = base64.b64encode(img_bytes).decode("utf-8")
    return {"base64": base64_str, "mimeType": mime_type}

async def upload_to_space(base64_str: str, mime_type: str, filename: str, token: str) -> str:
    img_bytes = base64.b64decode(base64_str)
    
    # Optimize image before upload (resize + compress)
    img_bytes, mime_type = optimize_image_bytes(img_bytes, mime_type)
    
    ext = "png" if "png" in mime_type else "jpg"
    files = {"files": (f"{filename}.{ext}", img_bytes, mime_type)}
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    client = await get_hf_client()
    res = await client.post(f"{HF_SPACE_URL}/upload", headers=headers, files=files)
    if res.status_code != 200:
        raise ValueError(f"HF upload failed (HTTP {res.status_code}): {res.text[:200]}")
    paths = res.json()
    print(f"[HF-IDMVTON] Uploaded {filename}: {paths[0]}")
    return paths[0]

# Token rotation state
_hf_token_index = 0

def get_all_hf_tokens() -> list:
    tokens = []
    seen = set()
    # Prioritize specific numbered tokens 1-4, then generic token
    for key in ["HUGGINGFACE_TOKEN_1", "HUGGINGFACE_TOKEN_2", "HUGGINGFACE_TOKEN_3", "HUGGINGFACE_TOKEN_4", "HUGGINGFACE_TOKEN_5", "HUGGINGFACE_TOKEN"]:
        val = (os.getenv(key) or "").strip()
        if val and val not in seen:
            seen.add(val)
            tokens.append((key, val))
    return tokens

async def run_huggingface_tryon(
    user_image_base64: str,
    user_image_mime_type: str,
    clothing_image_base64: str,
    clothing_image_mime_type: str,
    description: Optional[str] = None,
    use_token: bool = False,
    attempt_num: int = 1
) -> str:
    global _hf_token_index
    token = ""
    token_name = "anonymous"
    
    if use_token:
        tokens = get_all_hf_tokens()
        if tokens:
            # Rotate index
            idx = _hf_token_index % len(tokens)
            token_name, token = tokens[idx]
            print(f"[HF-ROTATION] Using token index {idx} ({token_name})")
        else:
            print("[HF-ROTATION] No HuggingFace tokens configured in environment variables.")
            
    print(f"[HF-IDMVTON] Starting IDM-VTON try-on (Auth: {token_name})...")
    
    try:
        # Upload both images in parallel for speed
        person_task = upload_to_space(user_image_base64, user_image_mime_type, "person", token)
        garment_task = upload_to_space(clothing_image_base64, clothing_image_mime_type, "garment", token)
        person_path, garment_path = await asyncio.gather(person_task, garment_task)
        print("Both images uploaded in parallel")
        
        garment_desc = description if description and len(description.strip()) > 5 else "A well-fitted fashion garment with natural fabric draping"
        print("[HF-IDMVTON] Files uploaded. Calling /call/tryon...")
        
        payload = {
            "data": [
                {
                    "background": {
                        "path": person_path,
                        "url": f"{HF_SPACE_URL}/file={person_path}",
                        "orig_name": "person.jpg",
                        "mime_type": user_image_mime_type,
                        "is_stream": False,
                        "meta": {"_type": "gradio.FileData"},
                    },
                    "layers": [],
                    "composite": None,
                },
                {
                    "path": garment_path,
                    "url": f"{HF_SPACE_URL}/file={garment_path}",
                    "orig_name": "garment.jpg",
                    "mime_type": clothing_image_mime_type,
                    "is_stream": False,
                    "meta": {"_type": "gradio.FileData"},
                },
                garment_desc,
                True, # auto-mask
                True, # auto-crop person
                30,   # num_inference_steps (denoise_steps) — raised from 15 for better detail fidelity
                42,   # seed
            ]
        }
        
        headers = {"Content-Type": "application/json; charset=utf-8"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        # Send request with retry loop
        max_retries = 2
        backoff_factor = 2.0
        event_id = None
        
        for attempt in range(1, max_retries + 1):
            try:
                print(f"[HF-IDMVTON] Sending request to IDM-VTON (Attempt {attempt}/{max_retries})")
                client = await get_hf_client()
                call_res = await client.post(f"{HF_SPACE_URL}/call/tryon", headers=headers, json=payload, timeout=120.0)
                
                if call_res.status_code in [404, 503]:
                    print(f"[HF-IDMVTON] Space might be sleeping (HTTP {call_res.status_code}). Sending wakeup request...")
                    try:
                        await client.get("https://huggingface.co/api/spaces/yisol/IDM-VTON", headers={"Authorization": f"Bearer {token}"} if token else {})
                        wakeup_wait = 8.0 * attempt
                        print(f"[HF-IDMVTON] Wakeup signal sent. Waiting {wakeup_wait} seconds for Space startup...")
                        await asyncio.sleep(wakeup_wait)
                        print("[HF-IDMVTON] Retrying /call/tryon after wakeup...")
                        call_res = await client.post(f"{HF_SPACE_URL}/call/tryon", headers=headers, json=payload, timeout=120.0)
                    except Exception as e:
                        print(f"[HF-IDMVTON] Wakeup attempt failed: {str(e)}")
                
                if call_res.status_code == 429 or call_res.status_code >= 500:
                    raise httpx.HTTPStatusError(
                        f"HF Space busy or down (HTTP {call_res.status_code})",
                        request=call_res.request,
                        response=call_res
                    )
                
                if call_res.status_code != 200:
                    raise ValueError(f"HuggingFace IDM-VTON returned HTTP {call_res.status_code}: {call_res.text[:300]}")
                
                call_data = call_res.json()
                event_id = call_data["event_id"]
                print(f"[HF-IDMVTON] Job submitted. Event ID: {event_id}")
                break
            except (httpx.HTTPError, ValueError) as e:
                if attempt == max_retries:
                    print(f"[HF-IDMVTON] Max retries reached. Failing: {str(e)}")
                    raise e
                sleep_time = backoff_factor ** attempt
                print(f"[HF-IDMVTON] Attempt {attempt} failed: {str(e)}. Retrying in {sleep_time} seconds...")
                await asyncio.sleep(sleep_time)
                
        # Step 3: Poll SSE stream or poll the endpoint for complete event
        print("[HF-IDMVTON] Polling for results via GET call...")
        sse_url = f"{HF_SPACE_URL}/call/tryon/{event_id}"
        
        result_data = None
        # Use retry loop for the SSE stream connection in case of temporary network glitches or cold-start
        for sse_attempt in range(1, 7):
            try:
                client = await get_hf_client()
                async with client.stream("GET", sse_url, headers=headers, timeout=240.0) as response:
                    if response.status_code != 200:
                        raise ValueError(f"HF SSE stream failed (HTTP {response.status_code})")
                        
                    buffer = ""
                    heartbeat_count = 0
                    async for chunk in response.aiter_text():
                        buffer += chunk
                        while "\n\n" in buffer:
                            event, buffer = buffer.split("\n\n", 1)
                            lines = event.strip().split("\n")
                            event_type = ""
                            data_line = ""
                            
                            for line in lines:
                                if line.startswith("event:"):
                                    event_type = line[6:].strip()
                                elif line.startswith("data:"):
                                    data_line = line[5:].strip()
                                    
                            if event_type:
                                print(f"[HF-IDMVTON] SSE event: {event_type}")
                                
                            if event_type == "estimation" and data_line:
                                import json as _json
                                try:
                                    est = _json.loads(data_line)
                                    rank = est.get("rank", 0)
                                    if rank > 0:
                                        print(f"[HF-IDMVTON] Currently #{rank} in queue. Patiently waiting for GPU processing...")
                                except Exception:
                                    pass
                                
                            if event_type == "heartbeat":
                                heartbeat_count += 1
                                if heartbeat_count >= MAX_HEARTBEATS:
                                    raise ValueError(f"HuggingFace queue too long ({heartbeat_count} heartbeats ≈ {heartbeat_count * 15}s). Failing fast to fallback.")
                                
                            if event_type == "error":
                                # Handle null/empty errors gracefully — often means Space is cold-starting
                                if not data_line or data_line == "null" or data_line == "None":
                                    print(f"[HF-IDMVTON] SSE error event with null data — Space may be cold-starting")
                                    raise ConnectionError(f"HuggingFace Space returned null error (cold start). Will retry.")
                                raise ValueError(f"HuggingFace IDM-VTON error: {data_line}")
                                
                            if event_type == "complete":
                                import json
                                try:
                                    result_data = json.loads(data_line)
                                except Exception:
                                    print(f"[HF-IDMVTON] Failed to parse complete data: {data_line[:200]}")
                                break
                        if result_data is not None:
                            break
                if result_data is not None:
                    break
            except ValueError as val_err:
                # Do not retry SSE connection on logical/execution errors (like queue too long or job error)
                raise val_err
            except ConnectionError as conn_err:
                # Retry on cold-start null errors
                if sse_attempt >= 6:
                    raise ValueError(str(conn_err))
                print(f"[HF-IDMVTON] Cold-start error (attempt {sse_attempt}/6), retrying SSE stream in 6s...")
                await asyncio.sleep(6.0)
            except Exception as sse_err:
                if sse_attempt >= 6:
                    raise sse_err
                print(f"[HF-IDMVTON] SSE stream connection failed: {str(sse_err)}. Retrying SSE stream in 4s...")
                await asyncio.sleep(4.0)
                        
        if not result_data or not isinstance(result_data, list):
            raise ValueError("HuggingFace IDM-VTON returned no result data")
            
        output_image = result_data[0]
        result_url = ""
        
        if isinstance(output_image, str):
            result_url = output_image
        elif isinstance(output_image, dict):
            if "url" in output_image:
                result_url = output_image["url"]
            elif "path" in output_image:
                result_url = f"{HF_SPACE_URL}/file={output_image['path']}"
                
        if not result_url:
            raise ValueError("Could not extract result image from HuggingFace response")
            
        print(f"[HF-IDMVTON] [OK] Result URL: {result_url[:120]}")
        
        # Verify image is accessible and convert output back to base64
        try:
            client = await get_hf_client()
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            img_res = await client.get(result_url, headers=headers, timeout=30.0)
            if img_res.status_code != 200:
                raise ValueError(f"Result image URL returned HTTP {img_res.status_code}")
            
            img_mime = img_res.headers.get("content-type", "image/png").split(";")[0]
            base64_out = base64.b64encode(img_res.content).decode("utf-8")
            print("[HF-IDMVTON] [OK] Converted result to base64 data URL")
            print("Generation completed")
            return f"data:{img_mime};base64,{base64_out}"
        except Exception as e:
            print(f"[HF-IDMVTON] Result image validation failed: {str(e)}")
            raise ValueError(f"Result image is inaccessible: {str(e)}")
    except Exception as error:
        tokens = get_all_hf_tokens()
        
        # Detect if it's a rate limit error
        is_429 = "429" in str(error) or "rate limit" in str(error).lower() or "quota" in str(error).lower()
        is_queue_busy = "queue too long" in str(error).lower() or "queue is busy" in str(error).lower() or "cold-starting" in str(error).lower()
        
        if is_429:
            print(f"[HF-RATE-LIMIT] Token '{token_name}' hit rate limit (HTTP 429).")
        if is_queue_busy:
            print(f"[HF-QUEUE-BUSY] HuggingFace space queue is full or cold-starting. Aborting rotation to trigger fast fallback.")
            raise error
            
        # Always advance to next token on failure
        _hf_token_index += 1
        
        if use_token and tokens and attempt_num < max(len(tokens), 1):
            next_idx = _hf_token_index % len(tokens)
            next_token_name = tokens[next_idx][0]
            print(f"[HF-ROTATION] Rotating from '{token_name}' to '{next_token_name}' (Attempt {attempt_num + 1}/{len(tokens)})...")
            return await run_huggingface_tryon(
                user_image_base64,
                user_image_mime_type,
                clothing_image_base64,
                clothing_image_mime_type,
                description,
                use_token=True,
                attempt_num=attempt_num + 1
            )
            
        # Record failure in SmartProviderRouter if all tokens exhausted
        try:
            from services.smart_provider_router import SmartProviderRouter
            SmartProviderRouter.get_instance().record_failure("HuggingFace IDM-VTON", is_rate_limit=is_429)
        except Exception:
            pass
            
        raise error

    # Success! Advance round-robin index for next request
    _hf_token_index += 1
    try:
        from services.smart_provider_router import SmartProviderRouter
        SmartProviderRouter.get_instance().record_success("HuggingFace IDM-VTON", latency_sec=12.0)
    except Exception:
        pass

async def run_huggingface_tryon_from_urls(
    user_image_url: str,
    clothing_image_url: str,
    description: Optional[str] = None
) -> str:
    print("[HF-IDMVTON] Converting image URLs to base64...")
    user_data, clothing_data = await asyncio.gather(
        to_base64_data(user_image_url),
        to_base64_data(clothing_image_url)
    )
    return await run_huggingface_tryon(
        user_data["base64"], user_data["mimeType"],
        clothing_data["base64"], clothing_data["mimeType"],
        description,
        use_token=False
    )
