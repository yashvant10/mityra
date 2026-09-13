from fastapi import APIRouter, Depends, HTTPException
from middleware.auth_middleware import get_current_user
from services import firebase_service

router = APIRouter()

@router.get("/me")
async def get_me(user = Depends(get_current_user)):
    profile = await firebase_service.get_user_profile(user["uid"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"user": profile}
