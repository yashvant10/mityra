from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from middleware.auth_middleware import get_current_user
from services import firebase_service

router = APIRouter()

@router.post("/profile", status_code=status.HTTP_201_CREATED)
async def create_profile(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        display_name = body.get("displayName") or ""
        email = body.get("email") or user.get("email") or "fashionista@look.ai"
        photo_url = body.get("photoURL") or ""
        
        existing = await firebase_service.get_user_profile(user_id)
        if existing:
            return {"profile": existing}
            
        profile = {
            "uid": user_id,
            "email": email,
            "displayName": display_name,
            "photoURL": photo_url,
            "bio": "",
            "stylePreferences": {
                "favoriteColors": [],
                "preferredStyles": [],
                "bodyType": "",
                "gender": "",
                "budget": "medium",
                "occasions": []
            },
            "styleScore": 0,
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
        
        return {"profile": profile}
    except Exception as e:
        print(f"Create profile error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create profile")

@router.get("/profile")
async def get_profile(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        profile = await firebase_service.get_user_profile(user_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return {"profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

@router.put("/profile")
async def update_profile(updates: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        
        # Prevent updating sensitive fields
        updates.pop("uid", None)
        updates.pop("email", None)
        updates.pop("subscription", None)
        updates.pop("plan", None)
        
        await firebase_service.update_user_profile(user_id, updates)
        updated_profile = await firebase_service.get_user_profile(user_id)
        return {"profile": updated_profile}
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.post("/upgrade")
async def upgrade_plan(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        plan = body.get("plan")
        
        valid_plans = ["free", "student", "pro", "business", "enterprise"]
        if not plan or plan not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
            
        expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
        await firebase_service.update_user_plan(user_id, plan, expires_at)
        
        await firebase_service.log_activity(user_id, "upgrade", f"upgraded to {plan} plan")
        
        profile = await firebase_service.get_user_profile(user_id)
        return {"message": "Plan upgraded successfully", "profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upgrade plan error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upgrade plan")

@router.get("/plan")
async def get_plan(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        profile = await firebase_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        plan = profile.get("plan") or profile.get("subscription") or "free"
        
        # Legacy compatible response
        return {
            "plan": plan,
            "triesUsedToday": 0,
            "maxTries": 999999,
            "adStatus": {
                "canWatch": True,
                "nextAvailableDate": ""
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get plan error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch plan info")

@router.post("/watch-ad")
async def watch_ad(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        import uuid
        ad_id = f"ad_legacy_{uuid.uuid4().hex[:12]}"
        new_credits = await firebase_service.record_ad_reward(user_id, ad_id, 1)
        return {
            "success": True,
            "triesUnlocked": 1,
            "credits": new_credits,
            "nextAvailableDate": (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        }
    except Exception as e:
        print(f"Watch ad error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record ad watch")
