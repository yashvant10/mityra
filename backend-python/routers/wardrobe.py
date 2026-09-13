import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Optional, List
from middleware.auth_middleware import get_current_user
from services import firebase_service, cloudinary_service

router = APIRouter()

# GET /api/wardrobe — Get all wardrobe items
@router.get("/")
async def get_wardrobe(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        items = await firebase_service.get_wardrobe_items(user_id)
        return {"items": items}
    except Exception as e:
        print(f"Get wardrobe error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch wardrobe")

# POST /api/wardrobe — Add item to wardrobe
@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_item(
    category: Optional[str] = Form(None),
    subcategory: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    imageUrl: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user = Depends(get_current_user)
):
    try:
        user_id = user["uid"]
        final_image_url = imageUrl or ""
        
        if image:
            content = await image.read()
            # Upload buffer using cloudinary_service
            res = await cloudinary_service.upload_image_buffer(content, "wardrobe")
            final_image_url = res["url"]
            
        if not final_image_url:
            raise HTTPException(status_code=400, detail="Image is required")
            
        parsed_tags = []
        if tags:
            try:
                parsed_tags = json.loads(tags)
            except Exception:
                # If comma separated list or similar
                parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]
                
        item = {
            "userId": user_id,
            "imageUrl": final_image_url,
            "category": category or "tops",
            "subcategory": subcategory or "",
            "color": color or "",
            "brand": brand or "",
            "tags": parsed_tags,
            "isFavorite": False,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        id_val = await firebase_service.add_wardrobe_item(item)
        item["id"] = id_val
        return {"item": item}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Add wardrobe item error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add wardrobe item")

# PUT /api/wardrobe/{id} — Update wardrobe item
@router.put("/{item_id}")
async def update_item(item_id: str, updates: dict, user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        item = await firebase_service.get_wardrobe_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Wardrobe item not found")
            
        if item.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this wardrobe item")
            
        updates.pop("userId", None)
        updates.pop("id", None)
        
        await firebase_service.update_wardrobe_item(item_id, updates)
        return {"message": "Item updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update wardrobe item error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update wardrobe item")

def extract_public_id(url: str) -> Optional[str]:
    """Helper to extract public_id or blob path from Cloudinary or Firebase Storage URLs."""
    if not url:
        return None
    try:
        if "cloudinary.com" in url:
            parts = url.split("/upload/")
            if len(parts) > 1:
                sub_parts = parts[1].split("/")
                # Remove version number if present (e.g. v123456/)
                if sub_parts[0].startswith("v") and sub_parts[0][1:].isdigit():
                    sub_parts = sub_parts[1:]
                joined = "/".join(sub_parts)
                return joined.rsplit(".", 1)[0]
        if "storage.googleapis.com" in url:
            parts = url.split("storage.googleapis.com/")
            if len(parts) > 1:
                sub_parts = parts[1].split("/", 1)
                if len(sub_parts) > 1:
                    return sub_parts[1].split("?")[0]
    except Exception as e:
        print(f"[EXTRACT-PUBLIC-ID-ERR] Failed to extract from {url}: {e}")
    return None

# DELETE /api/wardrobe/{id} — Delete wardrobe item
@router.delete("/{item_id}")
async def delete_item(item_id: str, user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        item = await firebase_service.get_wardrobe_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Wardrobe item not found")
            
        if item.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this wardrobe item")
            
        # Cloudinary/Firebase Storage asset cleanup to prevent leaks
        image_url = item.get("imageUrl")
        if image_url:
            public_id = extract_public_id(image_url)
            if public_id:
                try:
                    await cloudinary_service.delete_image(public_id)
                    print(f"[CLEANUP] Deleted asset '{public_id}' from storage")
                except Exception as ce:
                    print(f"[CLEANUP-ERR] Failed to delete asset '{public_id}' from storage: {ce}")
            
        await firebase_service.delete_wardrobe_item(item_id)
        return {"message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete wardrobe item error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete wardrobe item")


