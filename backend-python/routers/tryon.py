import os
import uuid
import base64
import hashlib
import httpx
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response, status
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional, List
from middleware.auth_middleware import get_current_user
from services import firebase_service, huggingface_service, replicate_service, openai_service, gemini_service, rapidapi_service
from services.cloudinary_service import image_store
from firebase_config import db

router = APIRouter()

# ─── Async Job Queue for Try-On Generation ────────────────────────────────────
# In-memory job store: job_id -> {status, stage, progress, result, error, created_at}
job_store: Dict[str, Dict[str, Any]] = {}
# Track in-flight requests to prevent duplicates: hash -> job_id
inflight_requests: Dict[str, str] = {}

GENERATION_STAGES = [
    {"id": "uploading", "label": "Uploading Image", "icon": "📤", "progress": 15},
    {"id": "analyzing", "label": "Analyzing Outfit", "icon": "🔍", "progress": 35},
    {"id": "generating", "label": "Generating Try-On", "icon": "✨", "progress": 75},
    {"id": "finalizing", "label": "Finalizing Result", "icon": "✅", "progress": 100},
]

# Helper: Evict local images after 30 mins
async def evict_local_image(image_id: str):
    await asyncio.sleep(30 * 60)
    image_store.pop(image_id, None)

# GET /image/{id} — serve a stored image buffer from disk or memory
@router.get("/image/{image_id}")
async def get_image(image_id: str):
    # Check disk storage first (so Celery files are accessible)
    os.makedirs("temp_images", exist_ok=True)
    for ext in ["png", "jpg", "jpeg"]:
        file_path = os.path.join("temp_images", f"{image_id}.{ext}")
        if os.path.exists(file_path):
            mime = "image/png" if ext == "png" else "image/jpeg"
            return FileResponse(file_path, media_type=mime)
            
    # Check in-memory image store
    entry = image_store.get(image_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return Response(
        content=entry["buffer"],
        media_type=entry["mimeType"],
        headers={"Cache-Control": "no-store"}
    )

# GET /proxy-image — generic proxy for CORS bypassing product images (Amazon, Flipkart, Myntra)
@router.get("/proxy-image")
async def proxy_image(url: str = Query(...)):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    
    try:
        # Some CDNs reject requests without a user agent
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, follow_redirects=True, timeout=10.0)
            response.raise_for_status()
            
            content_type = response.headers.get("Content-Type", "image/jpeg")
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400"
                }
            )
    except Exception as e:
        print(f"[PROXY-IMAGE] Error proxying image {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch image: {str(e)}")

# GET /products — fetch real clothing items via RapidAPI
@router.get("/products")
async def get_products(
    store: str = Query(...),
    gender: str = Query(...),
    occasion: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    mode: Optional[str] = Query("trending"),
    q: Optional[str] = Query(None),
    limit: int = Query(6, ge=1, le=50),
    skip: int = Query(0, ge=0)
):
    try:
        print(f"[ROUTE-PRODUCTS] Searching real products for Store: {store}, Gender: {gender}, Occasion: {occasion}, Category: {category}, Subcategory: {subcategory}, Mode: {mode}, Custom Query: {q}, Limit: {limit}, Skip: {skip}...")
        products = await rapidapi_service.search_real_products(
            store=store,
            gender=gender,
            occasion=occasion,
            category=category,
            custom_query=q,
            subcategory=subcategory,
            mode=mode
        )
        # Offset slicing for pagination
        sliced = products[skip:skip+limit]
        return {"products": sliced}
    except Exception as e:
        print(f"[ROUTE-PRODUCTS] RapidAPI failed, returning empty: {str(e)}")
        return {"products": [], "error": str(e)}

# ─── Async Generation Job Queue Endpoints ─────────────────────────────────────

# Helper: Compute MD5 hash of image bytes or string to detect duplicates
def get_image_hash(img_url: str) -> str:
    if not img_url:
        return ""
    if img_url.startswith("data:"):
        return hashlib.md5(img_url.encode("utf-8")).hexdigest()
    if "/api/tryon/image/" in img_url:
        import re as _re
        m = _re.search(r"/api/tryon/image/([a-f0-9\-]+)", img_url)
        if m:
            img_id = m.group(1)
            entry = image_store.get(img_id)
            if entry and "buffer" in entry:
                return hashlib.md5(entry["buffer"]).hexdigest()
    return hashlib.md5(img_url.encode("utf-8")).hexdigest()

def get_request_hash(user_img: str, cloth_img: str) -> str:
    user_hash = get_image_hash(user_img)
    cloth_hash = get_image_hash(cloth_img)
    return hashlib.md5(f"{user_hash}:{cloth_hash}".encode("utf-8")).hexdigest()

# Helper: Check Firestore cache for completed recent (24h) duplicate fits
async def check_tryon_cache(user_id: str, user_img: str, cloth_img: str) -> Optional[str]:
    # Cache temporarily disabled to force new generations and clear out old pasted-box results.
    return None

# POST /generate-async — submit task to Celery
@router.post("/generate-async")
async def generate_tryon_async(
    body: Dict[str, Any],
    user = Depends(get_current_user)
):
    """Submit a try-on generation job to Celery and return job_id immediately."""
    user_id = user["uid"]
    user_image_url = body.get("userImageUrl")
    clothing_image_url = body.get("clothingImageUrl")
    speed_mode = "hq"  # Always use HQ mode for full cascade + body preservation
    
    if not user_image_url or not clothing_image_url:
        raise HTTPException(status_code=400, detail="Both user image and clothing image URLs are required")
        
    # Calculate credit cost
    cost = 5 if speed_mode == "premium" else (3 if speed_mode == "hq" else 1)
    
    # Fetch user profile and verify credits
    profile = await firebase_service.get_user_profile(user_id)
    if not profile:
        profile = {
            "uid": user_id,
            "email": user.get("email") or "fashionista@look.ai",
            "displayName": "Fashionista",
            "photoURL": "",
            "bio": "",
            "stylePreferences": {"favoriteColors": [], "preferredStyles": [], "bodyType": "", "gender": "", "budget": "medium", "occasions": []},
            "styleScore": 85,
            "subscription": "free",
            "plan": "free",
            "credits": 5,
            "welcomeCreditsGiven": True,
            "totalCreditsPurchased": 0,
            "totalCreditsUsed": 0,
            "totalAdCredits": 0,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        await firebase_service.create_user_profile(profile)
        # Log signup bonus in creditTransactions
        from firebase_config import db
        tx_id = f"tx_welcome_{user_id[:8]}"
        db.collection("creditTransactions").document(tx_id).set({
            "transactionId": tx_id,
            "userId": user_id,
            "type": "signup_bonus",
            "credits": 5,
            "description": "Welcome signup bonus",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    user_credits = profile.get("credits", 0)
    if user_credits < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_credits",
                "message": f"Insufficient credits. Required {cost}, you have {user_credits}.",
                "required": cost,
                "current": user_credits
            }
        )
        
    # Phase 6 Performance Optimization: Check Firestore cache for identical duplicate requests
    cached_url = await check_tryon_cache(user_id, user_image_url, clothing_image_url)
    if cached_url:
        print(f"[CACHE-HIT] Duplicate request resolved instantly via Firestore cache: {cached_url}")
        mock_job_id = f"cached-{uuid.uuid4()}"
        job_store[mock_job_id] = {
            "status": "completed",
            "result": {
                "sessionId": "cached-session",
                "resultImageUrl": cached_url,
                "status": "completed",
                "method": "cache",
                "engine": "Firestore Cache Fallback"
            }
        }
        return {"jobId": mock_job_id, "status": "completed", "cached": True}
        
    # Submit task to Celery worker queue
    from celery_worker import process_tryon_task, GENERATION_STAGES
    
    # Verify Redis connection before queueing task
    try:
        from celery_worker import get_redis_client, celery_app
        import redis
        r = get_redis_client()
        if r:
            r.ping()
        else:
            raise ValueError("Redis connection client is not initialized.")
    except Exception as re_err:
        print(f"[REDIS-DISCONNECTED] Redis connectivity check failed: {re_err}. Attempting pool reset...")
        try:
            # Force close and clear connection pool to force reconnection
            celery_app.pool.force_close_all()
            # Try to ping again using direct connection
            r_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            if "ssl_cert_reqs" in r_url or "rediss://" in r_url:
                r_temp = redis.from_url(r_url, ssl_cert_reqs=None)
            else:
                r_temp = redis.from_url(r_url)
            r_temp.ping()
            print("[REDIS-RECONNECT-SUCCESS] Redis reconnected successfully!")
        except Exception as recon_err:
            print(f"[REDIS-RECONNECT-FAIL] Redis reconnection failed: {recon_err}")
            raise HTTPException(
                status_code=503,
                detail=f"Redis Service Unavailable: Backend queue is offline ({str(recon_err)})"
            )
            
    # Calculate requestHash and pass inside body dictionary to Celery worker
    request_hash = get_request_hash(user_image_url, clothing_image_url)
    body["requestHash"] = request_hash
    
    user_claims = {"uid": user_id, "email": user.get("email") or ""}
    
    # Queue task with auto-retry policy on connection errors
    try:
        task = process_tryon_task.apply_async(
            args=[body, user_claims],
            retry=True,
            retry_policy={
                'max_retries': 3,
                'interval_start': 0.2,
                'interval_step': 0.2,
                'interval_max': 0.5
            }
        )
    except Exception as queue_err:
        print(f"[CELERY-QUEUE-ERROR] Failed to queue task to Celery: {queue_err}")
        raise HTTPException(
            status_code=503,
            detail=f"Celery Service Unavailable: Failed to queue task to broker ({str(queue_err)})"
        )
    
    return {"jobId": task.id, "status": "pending", "stages": GENERATION_STAGES}

# GET /generate-status/{job_id} — poll task from Celery
@router.get("/generate-status/{job_id}")
async def get_generation_status(job_id: str):
    """Poll the status of an async try-on generation job from Celery."""
    from celery_worker import GENERATION_STAGES
    
    # Check if cached mock job
    if job_id.startswith("cached-") and job_id in job_store:
        entry = job_store[job_id]
        return {
            "jobId": job_id,
            "status": "completed",
            "stage": "completed",
            "stageIndex": 3,
            "progress": 100,
            "stages": GENERATION_STAGES,
            "result": entry["result"],
            "error": None,
        }
        
    from celery.result import AsyncResult
    res = AsyncResult(job_id)
    state = res.state  # PENDING, STARTED, PROGRESS, SUCCESS, FAILURE
    res_result = res.result
    
    # Verify if Celery worker is active for pending/processing tasks
    if state in ["PENDING", "STARTED", "PROGRESS"]:
        import time
        from celery_worker import get_redis_client
        
        worker_online = False
        r = get_redis_client()
        if r:
            try:
                hb = r.get("tryon_metrics:worker_heartbeat")
                if hb:
                    worker_online = True
            except Exception:
                pass
                
        if not worker_online:
            hb_file = "temp_images/worker_heartbeat.txt"
            if os.path.exists(hb_file):
                try:
                    mtime = os.path.getmtime(hb_file)
                    if time.time() - mtime < 20: # 20 seconds grace period
                        worker_online = True
                except Exception:
                    pass
                    
        # Fallback to inspect.ping() only if heartbeat checks fail (to avoid false-negatives when starting up)
        if not worker_online:
            from celery_worker import celery_app
            try:
                inspect = celery_app.control.inspect()
                inspect.timeout = 1.5  # Slightly longer timeout to prevent premature fails
                ping_res = inspect.ping()
                if ping_res:
                    worker_online = True
            except Exception as e:
                print(f"Failed to check Celery worker status: {e}")
                
        if not worker_online:
            print("[CELERY-WORKER-OFFLINE] No active Celery workers detected.")
            state = "FAILURE"
            res_result = "Celery worker offline: No active workers are running to process this task. Please start the worker."

    # File-based fallback: If Redis drops or gets stuck on the state, but the worker already saved a result file, use it.
    # This fixes the bug where Upstash Redis (free tier) fails to update the final SUCCESS state.
    if state in ["PENDING", "STARTED", "PROGRESS"]:
        result_file = os.path.join("temp_images", "results", f"{job_id}.json")
        if os.path.exists(result_file):
            try:
                import json as _json
                with open(result_file, "r") as f:
                    file_result = _json.load(f)
                if file_result and file_result.get("resultImageUrl"):
                    print(f"[STATUS-FALLBACK] Redis stuck on {state} for {job_id}, recovered from file backup!")
                    state = "SUCCESS"
                    res_result = file_result
            except Exception as fallback_err:
                print(f"[STATUS-FALLBACK] File read failed: {fallback_err}")

    status_map = {
        "PENDING": "pending",
        "STARTED": "processing",
        "PROGRESS": "processing",
        "SUCCESS": "completed",
        "FAILURE": "failed",
        "RETRY": "processing",
    }
    
    status_str = status_map.get(state, "pending")
    
    # Extract metadata for custom progress tracking safely
    meta = res.info if isinstance(res.info, dict) else {}
    stage = meta.get("stage", "uploading")
    stage_index = meta.get("stageIndex", 0)
    progress = meta.get("progress", 10)
    stages = meta.get("stages", GENERATION_STAGES)
    
    if state == "RETRY":
        stage = "Retrying after failure... (this may take a few moments)"
        stage_index = 2
        progress = 45 # Arbitrary middle progress during wait
    
    error = None
    result = None
    
    if state == "SUCCESS":
        status_str = "completed"
        stage = "completed"
        stage_index = 3
        progress = 100
        result = res_result
        # Guard: if result is None or missing resultImageUrl, treat as failure
        if not result or (isinstance(result, dict) and not result.get("resultImageUrl")):
            status_str = "failed"
            stage = "failed"
            progress = 0
            error = "Generation completed but produced no image result. Please try again."
            result = None
    elif state == "FAILURE":
        status_str = "failed"
        stage = "failed"
        progress = 0
        error = str(res_result)
        
    return {
        "jobId": job_id,
        "status": status_str,
        "stage": stage,
        "stageIndex": stage_index,
        "progress": progress,
        "stages": stages,
        "result": result,
        "error": error,
    }


# POST /tryon — Direct multipart/form-data try-on endpoint
@router.post("/tryon")
@router.post("")
async def handle_tryon_direct(
    person_image: Optional[UploadFile] = File(None),
    cloth_image: Optional[UploadFile] = File(None),
    person: Optional[UploadFile] = File(None),
    garment: Optional[UploadFile] = File(None),
    cloth: Optional[UploadFile] = File(None),
):
    """
    Direct endpoint for multipart/form-data try-on requests.
    Receives person image and cloth image, executes try-on inference,
    saves the output image, and returns the result in JSON.
    """
    print("\n[TRYON-API] ========================================")
    print("[TRYON-API] 🚀 Inference started...")

    person_file = person_image or person
    cloth_file = cloth_image or garment or cloth

    if not person_file or not cloth_file:
        print("[TRYON-API] ❌ Error: Missing required image files.")
        raise HTTPException(
            status_code=422,
            detail="Both person_image and cloth_image multipart files are required."
        )

    try:
        person_bytes = await person_file.read()
        cloth_bytes = await cloth_file.read()

        print(f"[TRYON-API] Received person_image ({len(person_bytes)} bytes) & cloth_image ({len(cloth_bytes)} bytes)")

        person_b64 = base64.b64encode(person_bytes).decode("utf-8")
        cloth_b64 = base64.b64encode(cloth_bytes).decode("utf-8")

        person_mime = person_file.content_type or "image/jpeg"
        cloth_mime = cloth_file.content_type or "image/jpeg"

        person_data_url = f"data:{person_mime};base64,{person_b64}"
        cloth_data_url = f"data:{cloth_mime};base64,{cloth_b64}"

        from services.huggingface_service import run_huggingface_tryon_from_urls
        result_url = None
        try:
            print("[TRYON-API] Running HuggingFace IDM-VTON inference...")
            result_url = await asyncio.wait_for(
                run_huggingface_tryon_from_urls(person_data_url, cloth_data_url, "clothing item"),
                timeout=120.0
            )
        except Exception as hf_err:
            print(f"[TRYON-API] HuggingFace inference failed/timed out: {hf_err}")

        if not result_url:
            print("[TRYON-API] Generation failed, raising error instead of silent fallback...")
            raise HTTPException(
                status_code=502,
                detail="Inference failed or timed out. Please try again."
            )

        os.makedirs("temp_images/results", exist_ok=True)
        out_filename = f"tryon_{uuid.uuid4().hex[:8]}.jpg"
        out_path = os.path.abspath(os.path.join("temp_images/results", out_filename))

        if result_url.startswith("data:"):
            header, b64data = result_url.split(",", 1) if "," in result_url else ("", result_url)
            img_data = base64.b64decode(b64data)
            with open(out_path, "wb") as f:
                f.write(img_data)
        elif result_url.startswith("http"):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(result_url)
                    if resp.status_code == 200:
                        with open(out_path, "wb") as f:
                            f.write(resp.content)
            except Exception as dl_err:
                print(f"[TRYON-API] Warning: Failed to save URL result to disk: {dl_err}")

        print(f"[TRYON-API] ✅ Inference finished.")
        print(f"[TRYON-API] 📁 Output image path: {out_path}")

        response_json = {
            "success": True,
            "result_image": result_url,
            "image": result_url,
            "resultImage": result_url,
            "image_url": result_url,
            "url": result_url,
            "output_path": out_path,
        }

        print(f"[TRYON-API] 📤 Response JSON: {list(response_json.keys())}")
        print("[TRYON-API] ========================================\n")

        return response_json

    except HTTPException:
        raise
    except Exception as err:
        print(f"[TRYON-API] ❌ Inference failed with error: {err}")
        raise HTTPException(status_code=500, detail=f"Try-On inference error: {str(err)}")


# POST /generate-fast — Direct Gemini try-on (no Celery, no queue)
@router.post("/generate-fast")
async def generate_fast_tryon(
    body: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Ultra-fast virtual try-on using HuggingFace IDM-VTON directly (No Celery queue)."""
    import time
    start = time.time()
    
    user_image_url = body.get("userImageUrl", "")
    clothing_image_url = body.get("clothingImageUrl", "")
    clothing_desc = body.get("clothingDescription", "clothing item")
    clothing_name = body.get("clothingName", "")
    
    if not user_image_url or not clothing_image_url:
        raise HTTPException(status_code=400, detail="Both userImageUrl and clothingImageUrl are required")
        
    user_id = user["uid"]
    cost = 1 # fast mode always costs 1
    
    # Check credits
    profile = await firebase_service.get_user_profile(user_id)
    user_credits = profile.get("credits", 0) if profile else 0
    if user_credits < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_credits",
                "message": f"Insufficient credits. Required {cost}, you have {user_credits}.",
                "required": cost,
                "current": user_credits
            }
        )
    
    try:
        from services.garment_preprocessor import prepare_clean_garment_url
        clean_clothing_url = await prepare_clean_garment_url(clothing_image_url)
        clothing_image_url = clean_clothing_url
        
        full_desc = f"{clothing_name} - {clothing_desc}".strip(" -") if clothing_name else clothing_desc
        
        print("[FAST-TRYON] Starting HuggingFace IDM-VTON (Primary)...")
        from services.huggingface_service import run_huggingface_tryon_from_urls
        hf_result = None
        try:
            hf_result = await asyncio.wait_for(
                run_huggingface_tryon_from_urls(user_image_url, clothing_image_url, full_desc),
                timeout=90.0
            )
        except Exception as hf_err:
            print(f"[FAST-TRYON] HuggingFace IDM-VTON failed: {hf_err}")
            
        if hf_result:
            elapsed = time.time() - start
            print(f"[FAST-TRYON] HuggingFace IDM-VTON succeeded in {elapsed:.1f}s")
            
            # Proxy HF URLs if needed
            if hf_result.startswith("https://yisol-idm-vton.hf.space"):
                base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
                from urllib.parse import quote
                hf_result = f"{base_url}/api/tryon/proxy-result?url={quote(hf_result)}"
                
            await firebase_service.deduct_user_credits(user_id, cost, "fast", f"fast_{uuid.uuid4().hex[:8]}")
            return {
                "status": "completed",
                "resultImageUrl": hf_result,
                "engine": "huggingface-idm-vton",
                "elapsed": round(elapsed, 1)
            }
            
        # Fallback 1: Replicate IDM-VTON
        if os.getenv("REPLICATE_API_TOKEN"):
            print("[FAST-TRYON] Trying Replicate IDM-VTON...")
            from services.replicate_service import run_replicate_try_on
            try:
                # Replicate requires either a public HTTPS URL or a Base64 Data URI.
                # Since the images might be on localhost (127.0.0.1), we MUST convert them to base64.
                from services.gemini_service import get_base64_from_url
                user_data_b64, clothing_data_b64 = await asyncio.gather(
                    get_base64_from_url(user_image_url),
                    get_base64_from_url(clothing_image_url)
                )
                rep_user = f"data:{user_data_b64['mimeType']};base64,{user_data_b64['base64']}"
                rep_cloth = f"data:{clothing_data_b64['mimeType']};base64,{clothing_data_b64['base64']}"
                
                rep_result = await asyncio.wait_for(
                    run_replicate_try_on(rep_user, rep_cloth, full_desc),
                    timeout=45.0
                )
                if rep_result:
                    elapsed = time.time() - start
                    await firebase_service.deduct_user_credits(user_id, cost, "fast", f"fast_{uuid.uuid4().hex[:8]}")
                    return {
                        "status": "completed",
                        "resultImageUrl": rep_result,
                        "engine": "replicate-idm-vton",
                        "elapsed": round(elapsed, 1)
                    }
            except Exception as e:
                print(f"[FAST-TRYON] Replicate failed: {e}")
                
        # Fallback 2: Gemini Image Editing
        if os.getenv("GEMINI_API_KEY"):
            print("[FAST-TRYON] Trying Gemini Image Editing...")
            from services.gemini_service import get_base64_from_url, try_image_generation
            try:
                user_data, clothing_data = await asyncio.gather(
                    get_base64_from_url(user_image_url),
                    get_base64_from_url(clothing_image_url)
                )
                prompt = (
                    f"VIRTUAL TRY-ON — Generate a single photorealistic image of this person wearing this exact garment.\n\n"
                    f"GARMENT: {full_desc}\n\n"
                    f"INSTRUCTIONS:\n"
                    f"1. Dress the person in Image 1 with the EXACT garment from Image 2.\n"
                    f"2. The garment must be WORN ON the body naturally — NOT overlaid as a floating box or rectangle.\n"
                    f"3. REMOVE any background from the garment image. Only the fabric/clothing should appear on the person.\n"
                    f"4. The garment must follow the person's body shape, pose, and proportions exactly.\n"
                    f"5. Keep the person's face, hair, skin, hands, and background IDENTICAL to the original.\n"
                    f"6. Add realistic fabric folds, shadows, and lighting that match the original photo.\n"
                    f"7. Garment edges must blend seamlessly — NO rectangular borders, NO white/beige background boxes, NO cut-paste artifacts.\n"
                    f"8. The result must look like a real photograph, not a digital overlay.\n\n"
                    f"Output ONLY the final photorealistic image."
                )
                gem_result = await try_image_generation(os.getenv("GEMINI_API_KEY"), prompt, user_data, clothing_data)
                if gem_result:
                    elapsed = time.time() - start
                    await firebase_service.deduct_user_credits(user_id, cost, "fast", f"fast_{uuid.uuid4().hex[:8]}")
                    return {
                        "status": "completed",
                        "resultImageUrl": gem_result,
                        "engine": "gemini-fast",
                        "elapsed": round(elapsed, 1)
                    }
            except Exception as e:
                print(f"[FAST-TRYON] Gemini failed: {e}")
                
        # Fallback 3: OpenAI DALL-E 3
        if os.getenv("OPENAI_API_KEY"):
            print("[FAST-TRYON] Trying OpenAI Image Model...")
            from services.openai_service import generate_dalle_try_on
            try:
                oai_result = await asyncio.wait_for(
                    generate_dalle_try_on(user_image_url, clothing_image_url),
                    timeout=45.0
                )
                if oai_result:
                    elapsed = time.time() - start
                    await firebase_service.deduct_user_credits(user_id, cost, "fast", f"fast_{uuid.uuid4().hex[:8]}")
                    return {
                        "status": "completed",
                        "resultImageUrl": oai_result,
                        "engine": "openai-dalle",
                        "elapsed": round(elapsed, 1)
                    }
            except Exception as e:
                print(f"[FAST-TRYON] OpenAI failed: {e}")
            
        raise ValueError("All AI generation engines failed. Please retry.")
        
    except Exception as e:
        print(f"[FAST-TRYON] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Virtual try-on failed: {str(e)}. Please retry.")


# POST /analyse-face — Analyze user face using Gemini 2.5 Flash
@router.post("/analyse-face")
async def analyse_face(body: Dict[str, Any]):
    face_image_url = body.get("faceImageUrl")
    if not face_image_url:
        raise HTTPException(status_code=400, detail="No face image URL provided")
        
    try:
        print(f"[ROUTE-ANALYSE-FACE] Running AI analysis on face: {face_image_url[:100]}...")
        analysis = await gemini_service.analyse_face_with_gemini(face_image_url)
        return analysis
    except Exception as e:
        print(f"[ROUTE-ANALYSE-FACE] Face analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /proxy-result — proxy a protected HuggingFace image URL using our token
@router.get("/proxy-result")
async def proxy_result(url: str = Query(...)):
    try:
        token = (os.getenv("HUGGINGFACE_TOKEN") or "").strip()
        print(f"[PROXY] Proxying request to: {url}")
        
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        async with httpx.AsyncClient(timeout=45.0) as client:
            img_res = await client.get(url, headers=headers)
            
        if img_res.status_code != 200:
            print(f"[PROXY] Failed to fetch image (HTTP {img_res.status_code})")
            raise HTTPException(status_code=img_res.status_code, detail="Failed to proxy image")
            
        content_type = img_res.headers.get("content-type", "image/png")
        return Response(
            content=img_res.content,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROXY] Error proxying image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# POST /upload — store image in-memory & on disk, return local URL + base64
@router.post("/upload")
async def upload_image_endpoint(
    image: UploadFile = File(...),
    user = Depends(get_current_user)
):
    try:
        content = await image.read()
        mime_type = image.content_type or "image/jpeg"
        
        image_id = str(uuid.uuid4())
        image_store[image_id] = {
            "buffer": content,
            "mimeType": mime_type
        }
        
        # Save to local filesystem temp_images/ folder so Celery worker process can access it
        ext = "png" if "png" in mime_type else "jpg"
        os.makedirs("temp_images", exist_ok=True)
        file_path = os.path.join("temp_images", f"{image_id}.{ext}")
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Evict after 30 mins (both memory & disk)
        asyncio.create_task(evict_local_image(image_id))
        
        async def evict_file(img_id, extension):
            await asyncio.sleep(30 * 60)
            p = os.path.join("temp_images", f"{img_id}.{extension}")
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        asyncio.create_task(evict_file(image_id, ext))
        
        base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5001)}")
        image_url = f"{base_url}/api/tryon/image/{image_id}"
        
        base64_str = base64.b64encode(content).decode("utf-8")
        data_url = f"data:{mime_type};base64,{base64_str}"
        
        return {"imageUrl": image_url, "publicId": image_id, "dataUrl": data_url}
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image")
@router.post("/generate")
async def generate_tryon(
    body: Dict[str, Any],
    user = Depends(get_current_user)
):
    try:
        user_id = user["uid"]
        user_image_url = body.get("userImageUrl")
        clothing_image_url = body.get("clothingImageUrl")
        clothing_description = body.get("clothingDescription")
        clothing_name = body.get("clothingName")
        clothing_price = body.get("clothingPrice")
        clothing_product_url = body.get("clothingProductUrl")
        clothing_store = body.get("clothingStore") or body.get("platform")
        platform = body.get("platform") or body.get("clothingStore")
        engine = body.get("engine") or "huggingface"
        speed_mode = "hq"
        
        if not user_image_url or not clothing_image_url:
            raise HTTPException(status_code=400, detail="Both user image and clothing image URLs are required")
            
        # Check cache first
        request_hash = get_request_hash(user_image_url, clothing_image_url)
        cached_url = await check_tryon_cache(user_id, user_image_url, clothing_image_url)
        if cached_url:
            print(f"[CACHE-HIT-SYNC] Duplicate request resolved instantly: {cached_url}")
            session = {
                "userId": user_id,
                "userImageUrl": user_image_url,
                "clothingImageUrl": clothing_image_url,
                "resultImageUrl": cached_url,
                "requestHash": request_hash,
                "status": "completed",
                "createdAt": datetime.utcnow().isoformat(),
                "clothingName": clothing_name,
                "clothingPrice": clothing_price,
                "clothingProductUrl": clothing_product_url,
                "clothingStore": clothing_store,
                "platform": platform,
                "isSaved": False
            }
            session_id = await firebase_service.create_tryon_session(session)
            await firebase_service.log_activity(user_id, "try_on", f"tried on {clothing_name or 'an outfit'} from {clothing_store or 'a store'} (cached)")
            return {
                "sessionId": session_id,
                "resultImageUrl": cached_url,
                "status": "completed",
                "method": "cache",
                "apiError": None,
                "message": "Successfully generated AI Try-On using Cache Fallback!"
            }

        # Fetch user profile and verify credits
        profile = await firebase_service.get_user_profile(user_id)
        if not profile:
            profile = {
                "uid": user_id,
                "email": user.get("email") or "fashionista@look.ai",
                "displayName": "Fashionista",
                "photoURL": "",
                "bio": "",
                "stylePreferences": {"favoriteColors": [], "preferredStyles": [], "bodyType": "", "gender": "", "budget": "medium", "occasions": []},
                "styleScore": 85,
                "subscription": "free",
                "plan": "free",
                "credits": 5,
                "welcomeCreditsGiven": True,
                "totalCreditsPurchased": 0,
                "totalCreditsUsed": 0,
                "totalAdCredits": 0,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat()
            }
            await firebase_service.create_user_profile(profile)
            # Log signup bonus in creditTransactions
            from firebase_config import db
            tx_id = f"tx_welcome_{user_id[:8]}"
            db.collection("creditTransactions").document(tx_id).set({
                "transactionId": tx_id,
                "userId": user_id,
                "type": "signup_bonus",
                "credits": 5,
                "description": "Welcome signup bonus",
                "timestamp": datetime.utcnow().isoformat()
            })
            
        if profile.get("isBanned"):
            raise HTTPException(status_code=403, detail="Your account has been banned. Access denied.")
            
        # Credit system temporarily disabled for beta testing — re-enable after user feedback collection
        # # Calculate credit cost
        # cost = 5 if speed_mode == "premium" else (3 if speed_mode == "hq" else 1)
        # user_credits = profile.get("credits", 0)
        # 
        # if user_credits < cost:
        #     raise HTTPException(
        #         status_code=402,
        #         detail={
        #             "error": "insufficient_credits",
        #             "message": f"Insufficient credits. Required {cost}, you have {user_credits}.",
        #             "required": cost,
        #             "current": user_credits
        #         }
        #     )
            
        final_result_url = ""
        method = "simulation"
        error_message = ""
        
        # User requested fallback order: HuggingFace IDM-VTON -> Replicate IDM-VTON -> Gemini Image Editing -> OpenAI Image Model
        # NO COMPOSITING ALLOWED to prevent flat rectangular boxes.
        
        # Helper: convert in-memory image URLs to data: URIs so fallback engines
        # don't need to re-fetch from the local server
        def to_data_url(url: str) -> str:
            if url and url.startswith("data:"):
                return url
            if url and "/api/tryon/image/" in url:
                import re as _re
                m = _re.search(r"/api/tryon/image/([a-f0-9\-]+)", url)
                if m:
                    img_id = m.group(1)
                    entry = image_store.get(img_id)
                    if entry:
                        b64 = base64.b64encode(entry["buffer"]).decode("utf-8")
                        return f"data:{entry['mimeType']};base64,{b64}"
            return url

        data_user_url = to_data_url(user_image_url)
        data_clothing_url = to_data_url(clothing_image_url)

        # 1. HuggingFace IDM-VTON
        if not final_result_url and os.getenv("HUGGINGFACE_TOKEN"):
            try:
                print("Running try-on using HuggingFace IDM-VTON...")
                final_result_url = await asyncio.wait_for(
                    huggingface_service.run_huggingface_tryon_from_urls(
                        user_image_url, clothing_image_url, clothing_description
                    ),
                    timeout=90.0
                )
                method = "huggingface"
                if final_result_url and final_result_url.startswith("https://yisol-idm-vton.hf.space"):
                    base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
                    from urllib.parse import quote
                    final_result_url = f"{base_url}/api/tryon/proxy-result?url={quote(final_result_url)}"
            except Exception as e:
                print(f"HuggingFace IDM-VTON failed: {str(e)}")
                if not error_message: error_message = str(e)
                
        # 2. Replicate IDM-VTON
        if not final_result_url and os.getenv("REPLICATE_API_TOKEN"):
            try:
                print("Running try-on using Replicate IDM-VTON...")
                final_result_url = await asyncio.wait_for(
                    replicate_service.run_replicate_try_on(
                        data_user_url, data_clothing_url, clothing_description
                    ),
                    timeout=45.0
                )
                method = "replicate"
            except Exception as e:
                print(f"Replicate VTON failed: {str(e)}")
                if not error_message: error_message = str(e)

        # 3. Gemini Image Editing
        if not final_result_url and os.getenv("GEMINI_API_KEY"):
            try:
                print("Running try-on using Gemini Imagen...")
                gemini_result = await asyncio.wait_for(
                    gemini_service.generate_gemini_try_on(
                        data_user_url, data_clothing_url, clothing_description
                    ),
                    timeout=30.0
                )
                if gemini_result and not gemini_result.startswith("data:application/json"):
                    final_result_url = gemini_result
                    method = "gemini"
                else:
                    print("Gemini returned compositing data (not a real image), skipping...")
            except Exception as e:
                print(f"Gemini Imagen VTON failed: {str(e)}")
                if not error_message: error_message = str(e)
                    
        # 4. OpenAI DALL-E 3
        if not final_result_url and os.getenv("OPENAI_API_KEY"):
            try:
                print("Running try-on using OpenAI DALL-E...")
                final_result_url = await asyncio.wait_for(
                    openai_service.generate_dalle_try_on(
                        user_image_url,
                        clothing_image_url
                    ),
                    timeout=20.0
                )
                method = "openai"
            except Exception as e:
                print(f"OpenAI DALL-E VTON failed: {str(e)}")
                if not error_message:
                    error_message = str(e)
                    
        # 5. Simulation Fallback
        if not final_result_url:
            print("Running in High-Fidelity Simulation Mode...")
            import json, base64
            sim_data = {
                "type": "composite",
                "userImageUrl": user_image_url,
                "clothingImageUrl": clothing_image_url,
                "positioning": {
                    "chinBottomY": 22.0,
                    "neckBaseY": 25.0,
                    "leftShoulderX": 30.0,
                    "rightShoulderX": 70.0,
                    "leftShoulderY": 25.0,
                    "rightShoulderY": 25.0,
                    "chestCenterX": 50.0,
                    "chestCenterY": 45.0,
                    "waistY": 70.0,
                    "waistLeftX": 32.0,
                    "waistRightX": 68.0,
                    "bodyTiltDegrees": 0.0,
                    "garmentType": "upper_body",
                    "isUpperBody": True,
                    "hasCollar": True,
                    "personFacing": "front",
                    "backgroundComplexity": "low"
                }
            }
            json_bytes = json.dumps(sim_data).encode("utf-8")
            base64_str = base64.b64encode(json_bytes).decode("utf-8")
            final_result_url = f"data:application/json;base64,{base64_str}"
            method = "simulation"
            
        # Store base64 data URLs in-memory to prevent Firestore size limits
        def store_if_base64(url: str) -> str:
            if url and url.startswith("data:"):
                try:
                    match = re.match(r"^data:([^;]+);base64,(.+)$", url)
                    if match:
                        mime = match.group(1)
                        if "json" in mime or mime == "application/json":
                            return url
                        buf = base64.b64decode(match.group(2))
                        img_id = str(uuid.uuid4())
                        image_store[img_id] = {"buffer": buf, "mimeType": mime}
                        asyncio.create_task(evict_local_image(img_id))
                        
                        b_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
                        stored_url = f"{b_url}/api/tryon/image/{img_id}"
                        print(f"[GENERATOR] Stored base64 in memory. Serving at: {stored_url}")
                        return stored_url
                except Exception as ex:
                    print(f"Failed to store base64 image in memory: {str(ex)}")
            return url
            
        import re
        final_user_image_url = store_if_base64(user_image_url)
        final_clothing_image_url = store_if_base64(clothing_image_url)
        final_result_image_url = store_if_base64(final_result_url)
        
        session = {
            "userId": user_id,
            "userImageUrl": final_user_image_url,
            "clothingImageUrl": final_clothing_image_url,
            "resultImageUrl": final_result_image_url,
            "requestHash": request_hash,
            "status": "completed",
            "createdAt": datetime.utcnow().isoformat(),
            "clothingName": clothing_name,
            "clothingPrice": clothing_price,
            "clothingProductUrl": clothing_product_url,
            "clothingStore": clothing_store,
            "platform": platform,
            "isSaved": False
        }
        
        session_id = await firebase_service.create_tryon_session(session)
        
        # Credit system temporarily disabled for beta testing — re-enable after user feedback collection
        # # Deduct credits atomically after successful generation
        # cost = 5 if speed_mode == "premium" else (3 if speed_mode == "hq" else 1)
        # await firebase_service.deduct_user_credits(user_id, cost, speed_mode, session_id)
        
        item_name = clothing_name or "an outfit"
        store_name = clothing_store or "an unknown store"
        await firebase_service.log_activity(user_id, "try_on", f"tried on {item_name} from {store_name}")
        
        engine_map = {
            "huggingface": "HuggingFace IDM-VTON",
            "gemini": "Gemini Imagen 3",
            "replicate": "IDM-VTON (Replicate)",
            "openai": "DALL-E 3",
            "simulation": "Simulation Mode"
        }
        
        return {
            "sessionId": session_id,
            "resultImageUrl": final_result_image_url,
            "status": "completed",
            "method": method,
            "apiError": error_message or None,
            "message": "Running in High-Fidelity Simulation Mode. Interactive clothing adjustments active!" if method == "simulation" else f"Successfully generated AI Try-On using {engine_map.get(method)}!"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Try-on generate error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate try-on preview")

# GET /api/tryon/history — Get try-on history
@router.get("/history")
async def get_history(limit: int = 20, cursor: Optional[str] = None, paginated: bool = Query(False), user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        history, nextPageToken = firebase_service.get_tryon_history_paginated(user_id, limit, cursor)
        if paginated:
            return {
                "history": history,
                "nextPageToken": nextPageToken
            }
        return {"history": history}
    except Exception as e:
        print(f"Try-on history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch try-on history")

# GET /api/tryon/health — health check route
@router.get("/health")
async def tryon_health():
    import json
    from celery_worker import get_redis_client
    r = get_redis_client()
    stats = {
        "status": "online",
        "model": "IDM-VTON",
        "queue": "available"
    }
    if r:
        try:
            stats["activeJobs"] = int(r.get("tryon_metrics:active_jobs") or 0)
            stats["failedJobs"] = int(r.get("tryon_metrics:failed_jobs") or 0)
            stats["succeededJobs"] = int(r.get("tryon_metrics:succeeded_jobs") or 0)
            times = r.lrange("tryon_metrics:generation_times", 0, -1)
            if times:
                stats["avgGenerationTime"] = round(sum(float(t) for t in times) / len(times), 2)
            else:
                stats["avgGenerationTime"] = 0
        except Exception as e:
            stats["error"] = str(e)
    else:
        try:
            if os.path.exists("temp_images/queue_metrics.json"):
                with open("temp_images/queue_metrics.json", "r") as f:
                    local_stats = json.load(f)
                stats["activeJobs"] = local_stats.get("active_jobs", 0)
                stats["failedJobs"] = local_stats.get("failed_jobs", 0)
                stats["succeededJobs"] = local_stats.get("succeeded_jobs", 0)
                times = local_stats.get("generation_times", [])
                if times:
                    stats["avgGenerationTime"] = round(sum(times) / len(times), 2)
                else:
                    stats["avgGenerationTime"] = 0
        except Exception:
            pass
    return stats

# GET /api/tryon/test — API Connection Test
@router.get("/test")
async def check_api_status():
    results = {"engines": {}}
    hf_token = (os.getenv("HUGGINGFACE_TOKEN") or "").strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    
    # Test HF
    if hf_token:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get("https://yisol-idm-vton.hf.space/api/", headers={"Authorization": f"Bearer {hf_token}"})
            results["engines"]["huggingface"] = {
                "configured": True,
                "reachable": res.status_code == 200,
                "status": res.status_code
            }
        except Exception as e:
            results["engines"]["huggingface"] = {
                "configured": True,
                "reachable": False,
                "error": str(e)
            }
    else:
        results["engines"]["huggingface"] = {"configured": False}
        
    # Test Gemini
    if gemini_key:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
            payload = {
                "contents": [{"parts": [{"text": 'Reply with exactly: "OK"'}]}]
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, params={"key": gemini_key}, json=payload)
            results["engines"]["gemini"] = {
                "configured": True,
                "reachable": res.status_code == 200,
                "status": res.status_code
            }
        except Exception as e:
            results["engines"]["gemini"] = {
                "configured": True,
                "reachable": False,
                "error": str(e)
            }
    else:
        results["engines"]["gemini"] = {"configured": False}
        
    results["message"] = "API status check complete."
    results["status"] = "succeeded"
    return results

# POST /api/tryon/track-click — track click analytics for outbound stores
@router.post("/track-click")
async def track_click(body: Dict[str, Any], user = Depends(get_current_user)):
    platform = body.get("platform")
    if not platform:
        raise HTTPException(status_code=400, detail="Missing platform parameter.")
        
    try:
        await firebase_service.track_platform_click(platform)
        return {"success": True, "message": f"Click tracked for platform: {platform}"}
    except Exception as e:
        print(f"Track click error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track platform click")

# POST /api/tryon/affiliate-click — Register outbound affiliate click and get affiliate URL
@router.post("/affiliate-click")
async def affiliate_click(body: Dict[str, Any], user = Depends(get_current_user)):
    user_id = user["uid"]
    clothing_name = body.get("clothingName")
    clothing_price = body.get("clothingPrice")
    clothing_store = body.get("clothingStore") or body.get("platform")
    platform = body.get("platform") or body.get("clothingStore")
    product_url = body.get("productUrl")
    
    if not clothing_name or not product_url:
        raise HTTPException(status_code=400, detail="Missing clothingName or productUrl parameters.")
        
    try:
        store = (clothing_store or platform or "amazon").lower()
        
        # 1. Generate proper affiliate tracking parameters
        affiliate_url = product_url
        
        # Check if it's a search or category page to prevent WAF bot triggers on tracking parameters
        lowercase_url = product_url.lower()
        is_search_or_category = (
            "/search" in lowercase_url or 
            "s?k=" in lowercase_url or 
            "?q=" in lowercase_url or 
            "?text=" in lowercase_url or
            ("myntra.com/" in lowercase_url and "/buy" not in lowercase_url and "/p/" not in lowercase_url) or
            ("ajio.com/" in lowercase_url and "/p/" not in lowercase_url)
        )
        
        # Only inject tracking parameters if it is a direct concrete product page
        if not is_search_or_category:
            if "amazon" in store:
                affiliate_url = product_url + ("&" if "?" in product_url else "?") + "tag=tryonx-21"
            elif "flipkart" in store:
                affiliate_url = product_url + ("&" if "?" in product_url else "?") + "affid=tryonx"
            elif "myntra" in store or "ajio" in store:
                affiliate_url = product_url + ("&" if "?" in product_url else "?") + "utm_source=tryonx&utm_medium=affiliate"
            else:
                affiliate_url = product_url + ("&" if "?" in product_url else "?") + "aff=tryonx"
            
        # 2. Parse price string
        parsed_price = 500
        if clothing_price:
            import re
            cleaned = re.sub(r"[^\d]", "", clothing_price)
            if cleaned:
                parsed_price = int(cleaned)
                
        # 3. Determine commission rate
        commission_rate = 0.08
        if "flipkart" in store:
            commission_rate = 0.06
        elif "myntra" in store:
            commission_rate = 0.10
        elif "ajio" in store:
            commission_rate = 0.12
        elif "meesho" in store:
            commission_rate = 0.05
            
        estimated_commission = round(parsed_price * commission_rate, 2)
        
        # 4. Simulate conversion (10%)
        import random
        is_converted = random.random() < 0.10
        
        # 5. Store in DB
        click_record = {
            "userId": user_id,
            "clothingName": clothing_name,
            "clothingPrice": clothing_price or f"₹{parsed_price}",
            "clothingStore": clothing_store or platform or "amazon",
            "platform": platform or clothing_store or "amazon",
            "productUrl": product_url,
            "affiliateUrl": affiliate_url,
            "timestamp": datetime.utcnow().isoformat(),
            "commissionRate": commission_rate,
            "estimatedCommission": estimated_commission,
            "isConverted": is_converted
        }
        
        click_id = await firebase_service.create_affiliate_click(click_record)
        
        try:
            await firebase_service.track_platform_click(platform or clothing_store or "amazon")
        except Exception:
            pass
            
        await firebase_service.log_activity(user_id, "affiliate_click", f"clicked Book Now on {platform or clothing_store or 'amazon'}")
        
        print(f"[AFFILIATE] Registered click {click_id} for User {user_id}. Store: {store}, Comm: Rs. {estimated_commission}, Converted: {is_converted}")
        
        return {
            "success": True,
            "clickId": click_id,
            "affiliateUrl": affiliate_url,
            "isConverted": is_converted,
            "estimatedCommission": estimated_commission
        }
    except Exception as e:
        print(f"Affiliate click tracking failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process affiliate click.")

# PUT /api/tryon/history/{id}/save — Toggle save state of a try-on session
@router.put("/history/{session_id}/save")
async def update_save_state(
    session_id: str,
    body: Dict[str, Any],
    user = Depends(get_current_user)
):
    is_saved = body.get("isSaved")
    if is_saved is None:
        raise HTTPException(status_code=400, detail="Missing isSaved parameter.")
        
    try:
        user_id = user["uid"]
        session = await firebase_service.get_tryon_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Try-on session not found")
            
        if session.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this try-on session")
            
        await firebase_service.update_tryon_session_save_state(session_id, bool(is_saved))
        return {"success": True, "message": f"Try-on session save state updated to: {is_saved}"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update save state error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update try-on save state")


# ─── TryOnX-Engine v2.0 Pipeline Stats & Production Dashboard ─────────────
@router.get("/pipeline-stats")
async def get_pipeline_stats(user = Depends(get_current_user)):
    """Return TryOnX-Engine v2.0 pipeline performance metrics & dashboard."""
    try:
        from services.tryonx_pipeline import get_pipeline
        pipeline = get_pipeline()
        return {"status": "ok", "stats": pipeline.get_stats()}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/feedback")
async def submit_feedback(
    generation_id: str = Form(...),
    rating: str = Form(...),
    comments: Optional[str] = Form(""),
    provider: Optional[str] = Form(""),
    quality_score: Optional[float] = Form(0.0),
    gen_time: Optional[float] = Form(0.0),
    user = Depends(get_current_user)
):
    """Submit user rating for an AI generation to train Smart Router priority."""
    try:
        from services.tryon_test_suite import FeedbackService
        doc = await FeedbackService.record_feedback(
            generation_id, rating, comments or "", provider or "",
            float(quality_score or 0.0), float(gen_time or 0.0),
            user_id=user.get("uid", "anonymous") if isinstance(user, dict) else str(user)
        )
        return {"status": "ok", "message": "Feedback recorded successfully", "feedback": doc}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/run-benchmark")
async def trigger_automated_benchmark(
    samples_per_category: int = Query(2, ge=1, le=10),
    user = Depends(get_current_user)
):
    """Run automated real-world testing across 15 garment categories and 5 body poses."""
    try:
        from services.tryon_test_suite import TryOnTestSuite
        report = await TryOnTestSuite.run_benchmark(sample_count_per_cat=samples_per_category)
        return {"status": "ok", "report": report}
    except Exception as e:
        return {"status": "error", "message": str(e)}

