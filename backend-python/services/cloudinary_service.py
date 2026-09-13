import os
import uuid
import httpx
import asyncio
from typing import Dict, Any, Optional
from firebase_config import is_mock

# Global in-memory store for local image serving (development mode)
image_store = {}

# Lazy configure Cloudinary
_cloudinary_configured = False
try:
    import cloudinary
    import cloudinary.uploader
    
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )
        _cloudinary_configured = True
        print("[CLOUDINARY] Cloudinary initialized successfully.")
    else:
        print("[CLOUDINARY] Cloudinary credentials missing. Fallback to Firebase Storage/Local active.")
except Exception as e:
    print(f"[CLOUDINARY] Could not load Cloudinary package: {str(e)}")

async def upload_to_firebase_storage(
    buffer: bytes,
    folder: str = "tryonx"
) -> Dict[str, str]:
    print("[DEBUG-FIREBASE-STORAGE] Uploading image buffer to Firebase Storage...")
    
    # If in mock mode, save to in-memory store instead
    if is_mock:
        filename = f"{folder}/{str(uuid.uuid4())}.png"
        rand_id = str(uuid.uuid4())
        image_store[rand_id] = {"buffer": buffer, "mimeType": "image/png"}
        
        # Evict after 30 mins
        async def evict():
            await asyncio.sleep(30 * 60)
            image_store.pop(rand_id, None)
        asyncio.create_task(evict())
        
        base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
        local_url = f"{base_url}/api/tryon/image/{rand_id}"
        print(f"[DEBUG-FIREBASE-STORAGE] Mock Upload succeeded. URL: {local_url}")
        return {"url": local_url, "publicId": rand_id}
        
    try:
        import firebase_admin
        from firebase_admin import storage
        
        bucket = storage.bucket()
        filename = f"{folder}/{str(uuid.uuid4())}.png"
        blob = bucket.blob(filename)
        
        # Run blocking call in executor
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: blob.upload_from_string(buffer, content_type="image/png"))
        
        # Try to make public
        try:
            await loop.run_in_executor(None, blob.make_public)
            url = f"https://storage.googleapis.com/{bucket.name}/{filename}"
        except Exception:
            # Fallback signed URL
            from datetime import datetime, timedelta
            signed_url = await loop.run_in_executor(
                None,
                lambda: blob.generate_signed_url(expiration=datetime.utcnow() + timedelta(days=365 * 10))
            )
            url = signed_url
            
        print(f"[DEBUG-FIREBASE-STORAGE] Successfully uploaded to Firebase Storage. URL: {url[:100]}")
        return {"url": url, "publicId": filename}
    except Exception as e:
        print(f"[DEBUG-FIREBASE-STORAGE] Firebase Storage upload failed: {str(e)}")
        # Ultimate fallback: local image store
        rand_id = str(uuid.uuid4())
        image_store[rand_id] = {"buffer": buffer, "mimeType": "image/png"}
        base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
        local_url = f"{base_url}/api/tryon/image/{rand_id}"
        return {"url": local_url, "publicId": rand_id}

async def upload_to_firebase_storage_from_url(
    image_url: str,
    folder: str = "tryonx"
) -> Dict[str, str]:
    print("[DEBUG-FIREBASE-STORAGE] Uploading from URL to Firebase Storage fallback...", image_url)
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(image_url)
        if res.status_code != 200:
            raise ValueError(f"Failed to fetch image from URL: {image_url}")
        return await upload_to_firebase_storage(res.content, folder)

async def upload_image(
    file_path: str,
    folder: str = "tryonx"
) -> Dict[str, str]:
    try:
        if not _cloudinary_configured:
            raise ValueError("Cloudinary unconfigured")
            
        loop = asyncio.get_event_loop()
        
        def run_cloud():
            return cloudinary.uploader.upload(
                file_path,
                folder=f"tryonx/{folder}",
                transformation=[
                    {"width": 1200, "height": 1200, "crop": "limit"},
                    {"quality": "auto"},
                    {"fetch_format": "auto"}
                ]
            )
            
        result = await loop.run_in_executor(None, run_cloud)
        return {
            "url": result["secure_url"],
            "publicId": result["public_id"]
        }
    except Exception as error:
        print(f"[CLOUDINARY] Upload failed, falling back: {str(error)}")
        try:
            if file_path.startswith("http://") or file_path.startswith("https://"):
                return await upload_to_firebase_storage_from_url(file_path, folder)
            else:
                with open(file_path, "rb") as f:
                    buffer = f.read()
                return await upload_to_firebase_storage(buffer, folder)
        except Exception as fb_error:
            print(f"[FIREBASE-FALLBACK] Firebase fallback also failed: {str(fb_error)}")
            raise error

async def upload_image_buffer(
    buffer: bytes,
    folder: str = "tryonx"
) -> Dict[str, str]:
    try:
        if not _cloudinary_configured:
            raise ValueError("Cloudinary unconfigured")
            
        loop = asyncio.get_event_loop()
        
        def run_cloud():
            # Cloudinary uploader expects a file-like object or bytes
            return cloudinary.uploader.upload(
                buffer,
                folder=f"tryonx/{folder}",
                transformation=[
                    {"width": 1200, "height": 1200, "crop": "limit"},
                    {"quality": "auto"},
                    {"fetch_format": "auto"}
                ]
            )
            
        result = await loop.run_in_executor(None, run_cloud)
        return {
            "url": result["secure_url"],
            "publicId": result["public_id"]
        }
    except Exception as error:
        print(f"[CLOUDINARY] Buffer upload failed, falling back to Firebase Storage: {str(error)}")
        try:
            return await upload_to_firebase_storage(buffer, folder)
        except Exception as fb_error:
            print(f"[FIREBASE-FALLBACK] Firebase fallback also failed: {str(fb_error)}")
            raise error

async def delete_image(public_id: str) -> None:
    try:
        if not _cloudinary_configured:
            raise ValueError("Cloudinary unconfigured")
            
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: cloudinary.uploader.destroy(public_id))
    except Exception as error:
        print(f"[CLOUDINARY] Delete failed, trying Firebase Storage deletion... {str(error)}")
        if not is_mock:
            try:
                import firebase_admin
                from firebase_admin import storage
                bucket = storage.bucket()
                blob = bucket.blob(public_id)
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, blob.delete)
                print(f"[FIREBASE-STORAGE] Successfully deleted from Firebase Storage: {public_id}")
            except Exception as fb_error:
                print(f"[FIREBASE-STORAGE-DELETE] Firebase delete failed: {str(fb_error)}")
        else:
            image_store.pop(public_id, None)

def get_optimized_url(public_id: str, options: Optional[Dict[str, Any]] = None) -> str:
    if public_id.startswith("tryon/") or public_id.startswith("tryon_results/") or "/" in public_id:
        if is_mock:
            base_url = os.getenv("BACKEND_BASE_URL", f"http://127.0.0.1:{os.getenv('PORT', 5000)}")
            return f"{base_url}/api/tryon/image/{public_id}"
            
        try:
            import firebase_admin
            from firebase_admin import storage
            bucket = storage.bucket()
            return f"https://storage.googleapis.com/{bucket.name}/{public_id}"
        except Exception:
            pass
            
    if not _cloudinary_configured:
        return public_id
        
    try:
        opt = options or {}
        w = opt.get("width", 800)
        h = opt.get("height", 800)
        crop = opt.get("crop", "fill")
        
        return cloudinary.utils.cloudinary_url(
            public_id,
            secure=True,
            transformation=[
                {"width": w, "height": h, "crop": crop},
                {"quality": "auto"},
                {"fetch_format": "auto"}
            ]
        )[0]
    except Exception:
        return public_id
