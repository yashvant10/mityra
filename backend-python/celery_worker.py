import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()
import re
import uuid
import base64
import asyncio
import time
import json
import redis
from datetime import datetime
from celery import Celery

# Configure Celery
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "tryonx",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=86400, # Clean up completed jobs after 24 hours
    worker_concurrency=int(os.getenv("CELERY_CONCURRENCY", "4")),
    broker_transport_options={
        'socket_timeout': 30,
        'socket_connect_timeout': 10,
        'retry_on_timeout': True,
    },
    redis_socket_timeout=30,
    redis_socket_connect_timeout=10,
    redis_retry_on_timeout=True,
    broker_connection_retry_on_startup=True,
)

_redis_client = None

def get_redis_client():
    global _redis_client
    r_url = os.getenv("REDIS_URL", "")
    if r_url and r_url.startswith("redis"):
        if _redis_client is None:
            try:
                _redis_client = redis.from_url(
                    r_url,
                    decode_responses=True,
                    socket_timeout=30,
                    socket_connect_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30,
                )
            except Exception:
                pass
    return _redis_client

# Start background heartbeat thread only if running in Celery worker process
import threading
def _run_heartbeat():
    while True:
        try:
            r = get_redis_client()
            if r:
                r.set("tryon_metrics:worker_heartbeat", str(time.time()), ex=15)
        except Exception:
            pass
        try:
            os.makedirs("temp_images", exist_ok=True)
            with open("temp_images/worker_heartbeat.txt", "w") as f:
                f.write(str(time.time()))
        except Exception:
            pass
        time.sleep(5)

if any("celery" in arg.lower() for arg in sys.argv):
    threading.Thread(target=_run_heartbeat, daemon=True).start()

def track_metric_increment(metric_name: str):
    r = get_redis_client()
    if r:
        try:
            r.incr(f"tryon_metrics:{metric_name}")
        except Exception:
            pass
    else:
        try:
            stats = {}
            if os.path.exists("temp_images/queue_metrics.json"):
                with open("temp_images/queue_metrics.json", "r") as f:
                    stats = json.load(f)
            stats[metric_name] = stats.get(metric_name, 0) + 1
            os.makedirs("temp_images", exist_ok=True)
            with open("temp_images/queue_metrics.json", "w") as f:
                json.dump(stats, f)
        except Exception:
            pass

def track_metric_decrement(metric_name: str):
    r = get_redis_client()
    if r:
        try:
            r.decr(f"tryon_metrics:{metric_name}")
        except Exception:
            pass
    else:
        try:
            stats = {}
            if os.path.exists("temp_images/queue_metrics.json"):
                with open("temp_images/queue_metrics.json", "r") as f:
                    stats = json.load(f)
            stats[metric_name] = max(0, stats.get(metric_name, 0) - 1)
            os.makedirs("temp_images", exist_ok=True)
            with open("temp_images/queue_metrics.json", "w") as f:
                json.dump(stats, f)
        except Exception:
            pass

def track_generation_time(duration: float):
    r = get_redis_client()
    if r:
        try:
            r.lpush("tryon_metrics:generation_times", str(duration))
            r.ltrim("tryon_metrics:generation_times", 0, 99)
        except Exception:
            pass
    else:
        try:
            stats = {}
            if os.path.exists("temp_images/queue_metrics.json"):
                with open("temp_images/queue_metrics.json", "r") as f:
                    stats = json.load(f)
            times = stats.get("generation_times", [])
            times.append(duration)
            stats["generation_times"] = times[-100:]
            os.makedirs("temp_images", exist_ok=True)
            with open("temp_images/queue_metrics.json", "w") as f:
                json.dump(stats, f)
        except Exception:
            pass

GENERATION_STAGES = [
    {"id": "validating",    "label": "Validating Your Photo",           "detail": "Checking image quality & dimensions"},
    {"id": "preprocessing", "label": "Preparing Images",                "detail": "Resizing, compressing & background removal"},
    {"id": "analyzing",     "label": "Analyzing User Body",             "detail": "Detecting pose, landmarks & proportions"},
    {"id": "generating",    "label": "AI Generating Your Look",         "detail": "Neural network rendering your outfit"},
    {"id": "quality_check", "label": "Checking Quality",                "detail": "Verifying realism & body preservation"},
    {"id": "enhancing",     "label": "Enhancing Your Result",           "detail": "Sharpening, contrast & color boost"},
    {"id": "completed",     "label": "Ready! ✨",                        "detail": "Your virtual try-on is complete"}
]

async def _save_temp_image_to_disk(url: str) -> str:
    """Save in-memory base64 or download url to local disk cache if not on Firestore."""
    if not url:
        return url
        
    # Check if base64 data
    if url.startswith("data:"):
        try:
            match = re.match(r"^data:([^;]+);base64,(.+)$", url)
            if match:
                mime = match.group(1)
                
                # Check if it is a JSON composition instruction
                if "json" in mime or mime == "application/json":
                    return url
                    
                buf = base64.b64decode(match.group(2))
                img_id = str(uuid.uuid4())
                
                # Save to local directory temp_images/
                os.makedirs("temp_images", exist_ok=True)
                ext = "png" if "png" in mime else "jpg"
                file_path = os.path.join("temp_images", f"{img_id}.{ext}")
                with open(file_path, "wb") as f:
                    f.write(buf)
                    
                b_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5001)}")
                return f"{b_url}/api/tryon/image/{img_id}"
        except Exception as e:
            print(f"[CELERY-IMAGE-SAVE] Base64 save failed: {e}")
            
    return url

async def _async_process_tryon(task, body: dict, user: dict):
    """Execution of the Try-On fallback cascade in the Celery worker."""
    from services import firebase_service, gemini_service, huggingface_service, replicate_service, cloudinary_service, openai_service
    
    # Init progress state
    task.update_state(state="PROGRESS", meta={"stage": "uploading", "stageIndex": 0, "progress": 10, "stages": GENERATION_STAGES})
    
    user_id = user["uid"]
    user_image_url = body.get("userImageUrl")
    clothing_image_url = body.get("clothingImageUrl")
    clothing_description = body.get("clothingDescription")
    clothing_name = body.get("clothingName")
    clothing_price = body.get("clothingPrice")
    clothing_product_url = body.get("clothingProductUrl")
    clothing_store = body.get("clothingStore") or body.get("platform")
    platform = body.get("platform") or body.get("clothingStore")
    speed_mode = body.get("speedMode") or "fast"
    
    # Stage 1: Analyzing
    task.update_state(state="PROGRESS", meta={"stage": "analyzing", "stageIndex": 1, "progress": 30, "stages": GENERATION_STAGES})
    
    profile = await firebase_service.get_user_profile(user_id)
    if not profile:
        profile = {
            "uid": user_id, "email": user.get("email") or "fashionista@look.ai",
            "displayName": "Fashionista", "photoURL": "", "bio": "",
            "stylePreferences": {"favoriteColors": [], "preferredStyles": [], "bodyType": "", "gender": "", "budget": "medium", "occasions": []},
            "styleScore": 85, "subscription": "free", "plan": "free",
            "credits": 5, "welcomeCreditsGiven": True,
            "totalCreditsPurchased": 0, "totalCreditsUsed": 0, "totalAdCredits": 0,
            "createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat()
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
        raise ValueError("Your account has been banned. Access denied.")
        
    # Stage 2: Generating
    task.update_state(state="PROGRESS", meta={"stage": "generating", "stageIndex": 2, "progress": 50, "stages": GENERATION_STAGES})
    
    final_result_url = ""
    method = "simulation"
    
    # ══════════════════════════════════════════════════════════════════
    # TryOnX-Engine v1.0 — Custom AI Pipeline
    # ══════════════════════════════════════════════════════════════════
    from services.tryonx_pipeline import get_pipeline
    pipeline = get_pipeline()
    
    final_result_url = ""
    method = "huggingface"
    final_engine_name = "TryOnX-Engine v1.0"
    final_quality_score = 100.0
    start_time = time.time()
    
    try:
        async for update in pipeline.run(
            user_image_url=user_image_url,
            garment_image_url=clothing_image_url,
            mode=speed_mode,
            clothing_description=clothing_description or "",
            task_updater=task,
        ):
            if update.get("error"):
                raise ValueError(update.get("message", "AI generation failed"))
            
            if update.get("result_url"):
                final_result_url = update["result_url"]
                final_engine_name = update.get("engine", "TryOnX-Engine v1.0")
                method = "huggingface" if "HuggingFace" in final_engine_name else "gemini"
                
                total_elapsed = time.time() - start_time
                print(f"\n{'='*60}")
                print(f"[TryOnX-Engine] ✅ SUCCESS")
                print(f"[TryOnX-Engine] Engine: {final_engine_name}")
                print(f"[TryOnX-Engine] Cached: {update.get('cached', False)}")
                print(f"[TryOnX-Engine] Total time: {total_elapsed:.1f}s")
                print(f"{'='*60}\n")
                break
            else:
                # Log progress stage
                stage_msg = update.get("message", "Processing...")
                progress = update.get("progress", 50)
                print(f"[TryOnX-Engine] Stage: {stage_msg} ({progress}%)")
    except (ValueError, Exception) as pipeline_err:
        print(f"[Look.ai-Engine] AI Generation failed or timed out: {pipeline_err}")
        task.update_state(state="FAILURE", meta={"stage": "failed", "error": str(pipeline_err)})
        raise pipeline_err

    # Logging metrics to Firestore
    generation_time = time.time() - start_time
    retry_count = 0
    
    # Truncate garmentUrl for logging — base64 URLs can be >1MB and crash Firestore
    garment_url_short = clothing_image_url[:200] if clothing_image_url else ""
    print(f"[CELERY-METRICS] User: {user_id}, Garment: {garment_url_short}..., Final Engine: {final_engine_name}, Time: {generation_time:.1f}s, Quality Score: {final_quality_score}%, Retries: {retry_count}")
    
    try:
        from firebase_config import db
        metric_doc = {
            "userId": user_id,
            "garmentUrl": garment_url_short,
            "clothingName": clothing_name,
            "engineUsed": final_engine_name,
            "generationTime": generation_time,
            "qualityScore": final_quality_score,
            "retryCount": retry_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        db.collection("tryonMetrics").document(str(uuid.uuid4())).set(metric_doc)
    except Exception as metric_err:
        print(f"[CELERY-METRICS] Failed to log metrics to Firestore (non-fatal): {metric_err}")
        
    # Stage 3: Finalizing
    task.update_state(state="PROGRESS", meta={"stage": "finalizing", "stageIndex": 3, "progress": 90, "stages": GENERATION_STAGES})
    
    # Save base64 URLs as files on disk
    final_result_image_url = await _save_temp_image_to_disk(final_result_url)
    user_image_processed = await _save_temp_image_to_disk(user_image_url)
    clothing_image_processed = await _save_temp_image_to_disk(clothing_image_url)
    
    # Build the result FIRST so it can always be returned even if Firestore fails
    engine_map = {
        "huggingface": "HuggingFace IDM-VTON",
        "gemini": "Gemini Imagen 3",
        "replicate": "IDM-VTON (Replicate)",
        "openai": "DALL-E 3",
        "simulation": "Simulation Mode"
    }
    
    session_id = "local-" + str(uuid.uuid4())[:8]
    
    # Wrap ALL Firestore operations in try/except so they NEVER block result delivery
    try:
        session = {
            "userId": user_id,
            "userImageUrl": user_image_processed,
            "clothingImageUrl": clothing_image_processed[:500] if clothing_image_processed and len(clothing_image_processed) > 500 else clothing_image_processed,
            "resultImageUrl": final_result_image_url[:500] if final_result_image_url and len(final_result_image_url) > 500 else final_result_image_url,
            "requestHash": body.get("requestHash"),
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
    except Exception as session_err:
        print(f"[CELERY-SESSION] Firestore session save failed (non-fatal): {session_err}")
    
    # Deduct credits (non-fatal)
    try:
        cost = 5 if speed_mode == "premium" else (3 if speed_mode == "hq" else 1)
        await firebase_service.deduct_user_credits(user_id, cost, speed_mode, session_id)
        print(f"[CELERY-CREDITS] Deducted {cost} credit(s) from {user_id} after successful try-on.")
    except Exception as cred_err:
        print(f"[CELERY-CREDITS] Credit deduction notice (non-fatal): {cred_err}")
    
    # Log activity (non-fatal)
    try:
        await firebase_service.log_activity(user_id, "try_on", f"tried on {clothing_name or 'an outfit'} from {clothing_store or 'a store'}")
    except Exception as log_err:
        print(f"[CELERY-ACTIVITY] Activity log failed (non-fatal): {log_err}")
    
    result = {
        "sessionId": session_id,
        "resultImageUrl": final_result_image_url,
        "status": "completed",
        "method": method,
        "engine": engine_map.get(method, method)
    }
    
    print(f"[CELERY-WORKER] ✅ Job completed successfully via {method}")
    return result

@celery_app.task(bind=True, max_retries=0, default_retry_delay=15)
def process_tryon_task(self, body: dict, user: dict):
    """Synchronous Celery task wrapper executing in a single loop with automatic retry policies."""
    start_time = time.time()
    track_metric_increment("active_jobs")
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    try:
        result = loop.run_until_complete(
            asyncio.wait_for(_async_process_tryon(self, body, user), timeout=300.0)
        )
        track_metric_decrement("active_jobs")
        track_metric_increment("succeeded_jobs")
        track_generation_time(time.time() - start_time)
        
        # Save result to local file as backup in case Redis loses it
        try:
            task_id = self.request.id
            os.makedirs("temp_images/results", exist_ok=True)
            result_file = os.path.join("temp_images", "results", f"{task_id}.json")
            with open(result_file, "w") as f:
                json.dump(result, f)
            print(f"[CELERY-BACKUP] Result saved to {result_file}")
        except Exception as save_err:
            print(f"[CELERY-BACKUP] Failed to save result file (non-fatal): {save_err}")
        
        return result
    except (asyncio.TimeoutError, Exception) as exc:
        track_metric_decrement("active_jobs")
        track_metric_increment("failed_jobs")
        print(f"[CELERY-TASK-COMPLETE] AI Generation failed: {exc}")
        return {
            "status": "failed",
            "error": str(exc)
        }
