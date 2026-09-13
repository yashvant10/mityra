import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

from dotenv import load_dotenv

# Load env variables FIRST so time_patch can read them if needed
load_dotenv()

# Apply clock correction BEFORE any Google Auth / Firebase imports
import time_patch  # noqa: F401 - auto-applies on import

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Import routers
from routers import auth_router, tryon, users, admin, wardrobe, outfits, recommendations, ai, payments, ads, voice_search

app = FastAPI(
    title="Look.ai API",
    version="2.0",
    description="FastAPI Backend for Look.ai Virtual Try-On Fashion Platform"
)


# CORS configuration
# Allow local developer dev ports and production domains via env
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.strip())

admin_url = os.getenv("ADMIN_URL")
if admin_url:
    origins.append(admin_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# GZip compression for all responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# Mount API routers
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(tryon.router, prefix="/api/tryon", tags=["Try-On"])
app.post("/tryon")(tryon.handle_tryon_direct)
app.post("/api/tryon")(tryon.handle_tryon_direct)
app.include_router(wardrobe.router, prefix="/api/wardrobe", tags=["Wardrobe"])
app.include_router(outfits.router, prefix="/api/outfits", tags=["Outfits"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Stylist"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Center"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(ads.router, prefix="/api/ads", tags=["Ads"])
app.include_router(voice_search.router, prefix="/api/v1/voice-search", tags=["Voice Search"])

# Pre-warm product cache on startup for instant first loads
@app.on_event("startup")
async def startup_event():
    """Verify configurations and pre-warm product cache."""
    import os
    import asyncio
    from services.rapidapi_service import search_real_products
    
    # Strict Production Environment Check: raise ValueError if REDIS_URL is missing in production
    env = os.getenv("ENV", "development").lower()
    if env == "production":
        redis_url = os.getenv("REDIS_URL", "")
        if not redis_url or not redis_url.startswith("redis"):
            raise ValueError("REDIS_URL is required and must start with 'redis' when running in production mode.")
    
    # 1. Startup validation of critical API keys
    critical_keys = {
        "OPENAI_API_KEY": "AI Stylist Chatbot & OpenAI Try-On Fallback",
        "GEMINI_API_KEY": "Gemini Try-On & Landmark Detection Fallback",
        "RAPIDAPI_KEY": "E-commerce Store Catalog Scrapers / Fallback APIs",
        "FIREBASE_PRIVATE_KEY": "Real Firebase Database Connection",
        "CLOUDINARY_API_SECRET": "Digital Wardrobe File Uploads Cache"
    }
    
    print("\n[STARTUP] 🛠️  Validating Production Environment Configurations...")
    missing_any = False
    for key, desc in critical_keys.items():
        val = os.getenv(key)
        if not val or val.strip() in ["", "placeholder", "your_api_key_here", "your_project_id", "your_client_email", "your_cloudinary_secret"]:
            print(f"  ⚠️  WARNING: Critical API key '{key}' is MISSING or default ({desc}). Fallback active.")
            missing_any = True
        else:
            print(f"  ✅ '{key}' is configured ({desc}).")
    if not missing_any:
        print("[STARTUP] 👍 All critical environment API configurations successfully loaded!\n")
    else:
        print("[STARTUP] ⚠️  Some API configurations are missing. Certain fallbacks will be active.\n")

    # 1b. Verify RapidAPI key status live
    try:
        from services.rapidapi_service import verify_rapidapi_keys
        await verify_rapidapi_keys()
    except Exception as e:
        print(f"[STARTUP] ⚠️ Failed to run RapidAPI key check: {e}")

    # 2. Pre-fetch popular categories in the background so it does not block server startup
    async def run_warmup():
        print("[STARTUP] 🔥 Pre-warming product cache in background...")
        warmup_tasks = []
        for store in ["flipkart", "amazon", "myntra"]:
            for gender in ["male", "female"]:
                warmup_tasks.append(search_real_products(store, gender, "casual", "tshirts"))
        try:
            results = await asyncio.gather(*warmup_tasks, return_exceptions=True)
            success_count = sum(1 for r in results if not isinstance(r, Exception))
            print(f"[STARTUP] ✅ Background cache pre-warmed: {success_count}/{len(warmup_tasks)} categories loaded")
        except Exception as e:
            print(f"[STARTUP] ⚠️ Background cache warmup failed: {str(e)}")

    # asyncio.create_task(run_warmup())  # Disabled: prevents event loop freeze on Windows startup


@app.get("/")
async def root():
    return {
        "message": "🚀 Look.ai FastAPI Backend v2.0 is online",
        "status": "online",
        "framework": "FastAPI (Python)"
    }

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "platform": "Look.ai",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

from datetime import datetime

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"\n  [SERVER] Look.ai FastAPI Backend starting...")
    print(f"  Running on port {port}")
    print(f"  Environment: development\n")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, app_dir=current_dir)
