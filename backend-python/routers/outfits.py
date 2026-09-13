from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from middleware.auth_middleware import get_current_user
from services import firebase_service

router = APIRouter()

# GET /api/outfits — Fetch all saved outfit combinations
@router.get("/")
async def get_saved_outfits(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        outfits = await firebase_service.get_outfits(user_id)
        return {"outfits": outfits}
    except Exception as e:
        print(f"Get outfits error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch outfits")

# POST /api/outfits — Save a new outfit combination
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_outfit(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        
        name = body.get("name") or "Custom Outfit Combo"
        items = body.get("items") or []
        occasion = body.get("occasion") or "Casual"
        season = body.get("season") or "All Season"
        rating = body.get("rating") or 5
        is_favorite = body.get("isFavorite") or False
        image_url = body.get("imageUrl") or ""
        
        outfit = {
            "userId": user_id,
            "name": name,
            "items": items,
            "occasion": occasion,
            "season": season,
            "rating": rating,
            "isFavorite": is_favorite,
            "imageUrl": image_url,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        id_val = await firebase_service.save_outfit(outfit)
        outfit["id"] = id_val
        return {"outfit": outfit}
    except Exception as e:
        print(f"Save outfit error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save outfit")
