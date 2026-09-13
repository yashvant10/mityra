import os
from datetime import datetime, timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth_middleware import get_current_user
from services import firebase_service
from firebase_config import db

router = APIRouter()

@router.post("/reward", status_code=status.HTTP_200_OK)
async def claim_ad_reward(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        ad_id = body.get("adId")
        
        if not ad_id:
            raise HTTPException(status_code=400, detail="Missing adId in request body")
            
        # 1. Prevent duplicate rewards (check if adId exists in adRewards collection)
        ad_ref = db.collection("adRewards").document(ad_id)
        ad_snap = ad_ref.get()
        if ad_snap.exists:
            raise HTTPException(status_code=400, detail="Duplicate reward claim for this advertisement")
            
        now = datetime.utcnow()
        
        # 2. Check Cooldown: 1 reward every 10 minutes
        # Query most recent ad reward for user
        query_cooldown = db.collection("adRewards")\
            .where("userId", "==", user_id)\
            .order_by("timestamp", direction="DESCENDING")\
            .limit(1)
        cooldown_snap = query_cooldown.get()
        
        # Fallback list query if index is missing
        if not cooldown_snap:
            try:
                all_rewards = db.collection("adRewards").where("userId", "==", user_id).get()
                rewards_list = [r.to_dict() for r in all_rewards]
                rewards_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
                cooldown_snap = rewards_list[:1]
            except Exception:
                cooldown_snap = []
                
        if cooldown_snap:
            last_reward = cooldown_snap[0] if not isinstance(cooldown_snap[0], dict) else cooldown_snap[0]
            last_time_str = last_reward.get("timestamp") if isinstance(last_reward, dict) else last_reward.to_dict().get("timestamp")
            
            if last_time_str:
                last_time = datetime.fromisoformat(last_time_str.replace("Z", "+00:00"))
                time_diff = now - last_time
                if time_diff < timedelta(minutes=10):
                    seconds_left = int(600 - time_diff.total_seconds())
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": "cooldown_active",
                            "message": f"Cooldown active. Please wait {seconds_left // 60}m {seconds_left % 60}s.",
                            "secondsLeft": seconds_left
                        }
                    )
                    
        # 3. Check Daily Limit: Max 10 rewarded credits per day (starting from midnight UTC)
        start_of_today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        query_daily = db.collection("adRewards")\
            .where("userId", "==", user_id)\
            .where("timestamp", ">=", start_of_today.isoformat())
        daily_snap = query_daily.get()
        
        # Fallback if index is missing
        if not daily_snap:
            try:
                all_rewards = db.collection("adRewards").where("userId", "==", user_id).get()
                daily_snap = [r for r in all_rewards if r.to_dict().get("timestamp", "") >= start_of_today.isoformat()]
            except Exception:
                daily_snap = []
                
        daily_count = len(daily_snap)
        if daily_count >= 10:
            raise HTTPException(status_code=400, detail="Daily rewarded ads limit reached (Max 10 per day)")
            
        # 4. Award credit atomically
        new_credits = await firebase_service.record_ad_reward(user_id, ad_id, 1)
        
        return {
            "success": True,
            "message": "Ad reward claimed successfully (+1 credit)",
            "credits": new_credits,
            "cooldownRemaining": 600,
            "dailyRewardsRemaining": 10 - daily_count - 1
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CLAIM-AD-REWARD-ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to claim ad reward")

@router.get("/status")
async def get_ad_status(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        profile = await firebase_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        now = datetime.utcnow()
        
        # 1. Cooldown remaining
        cooldown_remaining = 0
        query_cooldown = db.collection("adRewards")\
            .where("userId", "==", user_id)\
            .order_by("timestamp", direction="DESCENDING")\
            .limit(1)
        cooldown_snap = query_cooldown.get()
        
        if not cooldown_snap:
            try:
                all_rewards = db.collection("adRewards").where("userId", "==", user_id).get()
                rewards_list = [r.to_dict() for r in all_rewards]
                rewards_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
                cooldown_snap = rewards_list[:1]
            except Exception:
                cooldown_snap = []
                
        if cooldown_snap:
            last_reward = cooldown_snap[0] if not isinstance(cooldown_snap[0], dict) else cooldown_snap[0]
            last_time_str = last_reward.get("timestamp") if isinstance(last_reward, dict) else last_reward.to_dict().get("timestamp")
            if last_time_str:
                last_time = datetime.fromisoformat(last_time_str.replace("Z", "+00:00"))
                time_diff = now - last_time
                if time_diff < timedelta(minutes=10):
                    cooldown_remaining = int(600 - time_diff.total_seconds())
                    
        # 2. Daily rewards remaining
        start_of_today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        query_daily = db.collection("adRewards")\
            .where("userId", "==", user_id)\
            .where("timestamp", ">=", start_of_today.isoformat())
        daily_snap = query_daily.get()
        
        if not daily_snap:
            try:
                all_rewards = db.collection("adRewards").where("userId", "==", user_id).get()
                daily_snap = [r for r in all_rewards if r.to_dict().get("timestamp", "") >= start_of_today.isoformat()]
            except Exception:
                daily_snap = []
                
        daily_count = len(daily_snap)
        daily_rewards_remaining = max(0, 10 - daily_count)
        
        return {
            "credits": profile.get("credits", 0),
            "cooldownRemaining": cooldown_remaining,
            "dailyRewardsRemaining": daily_rewards_remaining
        }
    except Exception as e:
        print(f"[GET-AD-STATUS-ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rewarded ads status")
