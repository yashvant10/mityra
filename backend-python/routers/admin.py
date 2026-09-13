import os
import time
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from typing import Dict, Any, Optional, List
from middleware.admin_middleware import verify_admin_token
from services import firebase_service
from firebase_config import db, is_mock
from security_utils import (
    verify_password,
    create_access_token,
    create_refresh_token,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD_HASH
)

router = APIRouter()

# Rate limiting for admin logins in-memory
failed_logins = {}

# POST /api/admin/login
@router.post("/login")
async def admin_login(body: Dict[str, Any], request: Request):
    username = body.get("username")
    password = body.get("password")
    ip = request.client.host or "unknown"
    
    # Check rate limit
    record = failed_logins.get(ip)
    if record and record["lockoutUntil"] > time.time():
        minutes_left = int((record["lockoutUntil"] - time.time()) / 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {minutes_left} minutes."
        )
        
    admin_user = os.getenv("ADMIN_USERNAME", DEFAULT_ADMIN_USERNAME)
    admin_pw_hash = os.getenv("ADMIN_PASSWORD_HASH", DEFAULT_ADMIN_PASSWORD_HASH)
    
    if username == admin_user and verify_password(password, admin_pw_hash):
        failed_logins.pop(ip, None)
        
        claims = {"sub": username, "role": "admin"}
        access_token = create_access_token(claims)
        refresh_token = create_refresh_token(claims)
        
        return {
            "token": access_token,
            "refreshToken": refresh_token,
            "tokenType": "bearer"
        }
        
    # Increment failed attempts
    attempts = (record["attempts"] if record else 0) + 1
    if attempts >= 3:
        failed_logins[ip] = {
            "attempts": attempts,
            "lockoutUntil": time.time() + 30 * 60  # 30 mins
        }
        raise HTTPException(
            status_code=429,
            detail="Account locked for 30 minutes due to 3 failed login attempts."
        )
    else:
        failed_logins[ip] = {
            "attempts": attempts,
            "lockoutUntil": 0
        }
        
    raise HTTPException(status_code=401, detail="Invalid admin credentials.")

# POST /api/admin/refresh-token
@router.post("/refresh-token")
async def refresh_admin_token(body: Dict[str, Any]):
    refresh_token = body.get("refreshToken")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Missing refresh token")
        
    try:
        from security_utils import decode_token
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token type")
            
        username = payload.get("sub")
        claims = {"sub": username, "role": "admin"}
        new_access_token = create_access_token(claims)
        
        return {
            "token": new_access_token,
            "tokenType": "bearer"
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or expired refresh token")


# GET /api/admin/dashboard
@router.get("/dashboard", dependencies=[Depends(verify_admin_token)])
async def get_dashboard_stats():
    try:
        all_users = await firebase_service.get_all_users()
        total_users = len(all_users)
        premium_users = 0
        
        free_count = 0
        student_count = 0
        pro_count = 0
        business_count = 0
        
        now = datetime.utcnow()
        
        for u in all_users:
            plan = u.get("plan") or u.get("subscription") or "free"
            
            # Check expiration
            is_valid = True
            expires_str = u.get("planExpiresAt")
            if expires_str:
                try:
                    expires_dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
                    if expires_dt.timestamp() < now.timestamp():
                        is_valid = False
                except Exception:
                    pass
                    
            active_plan = plan if is_valid else "free"
            
            if active_plan != "free":
                premium_users += 1
            if active_plan == "free":
                free_count += 1
            elif active_plan == "student":
                student_count += 1
            elif active_plan == "pro":
                pro_count += 1
            elif active_plan == "business":
                business_count += 1
                
        # Try-ons
        try_ons_len = 0
        today_try_ons = 0
        if is_mock:
            snap = await db.collection("tryons").get()
            try_ons_len = snap.size
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            today_try_ons = sum(1 for d in snap if d.to_dict().get("createdAt", "").startswith(today_str))
        else:
            snap = db.collection("tryons").get()
            try_ons_len = len(snap)
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            today_try_ons = sum(1 for d in snap if d.to_dict().get("createdAt", "").startswith(today_str))
            
        # Ads
        ads_size = 0
        if is_mock:
            ads_snap = await db.collection("adWatches").get()
            ads_size = ads_snap.size
        else:
            ads_snap = db.collection("adWatches").get()
            ads_size = len(ads_snap)
        ad_revenue = ads_size * 3.50
        
        # Affiliate
        aff_stats = await firebase_service.get_affiliate_stats()
        
        # Subs Revenue
        sub_revenue = await firebase_service.get_revenue_stats() * 83  # INR approx
        
        # Recharts mock 30 days
        daily_revenue = []
        for i in range(29, -1, -1):
            d = datetime.utcnow() - timedelta(days=i)
            daily_revenue.append({
                "date": d.strftime("%m-%d"),
                "revenue": random.randint(1000, 6000)
            })
            
        return {
            "totalUsers": total_users,
            "premiumUsers": premium_users,
            "freeUsers": free_count,
            "studentCount": student_count,
            "proCount": pro_count,
            "businessCount": business_count,
            "todayTryOns": today_try_ons,
            "totalTryOns": try_ons_len,
            "adRevenue": ad_revenue,
            "affiliateRevenue": aff_stats["estimatedEarnings"],
            "subRevenue": sub_revenue,
            "dailyRevenue": daily_revenue
        }
    except Exception as e:
        print(f"Admin dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# GET /api/admin/credit-analytics
@router.get("/credit-analytics", dependencies=[Depends(verify_admin_token)])
async def get_admin_credit_analytics():
    try:
        # 1. Total Revenue & Credits Sold & Revenue By Plan
        payments_ref = db.collection("payments").where("status", "==", "completed")
        payments_snapshot = payments_ref.get()
        
        total_revenue = 0.0
        total_credits_sold = 0
        revenue_by_plan = {
            "Starter": 0.0,
            "Pro": 0.0,
            "Premium": 0.0
        }
        
        for doc in payments_snapshot:
            data = doc.to_dict()
            amt = float(data.get("amount", 0))
            creds = int(data.get("credits", 0) or data.get("creditsAdded", 0))
            plan = data.get("plan", "Starter")
            
            total_revenue += amt
            total_credits_sold += creds
            
            plan_name = "Starter"
            if plan in ["Pro", "pro", "Pro Plan"]:
                plan_name = "Pro"
            elif plan in ["Premium", "premium", "Premium Plan"]:
                plan_name = "Premium"
                
            revenue_by_plan[plan_name] = revenue_by_plan.get(plan_name, 0.0) + amt
            
        # 2. Total Credits Consumed
        users_ref = db.collection("users")
        users_snapshot = users_ref.get()
        total_credits_consumed = 0
        
        users_list = []
        for doc in users_snapshot:
            data = doc.to_dict()
            consumed = int(data.get("totalCreditsUsed", 0))
            total_credits_consumed += consumed
            
            users_list.append({
                "uid": doc.id,
                "email": data.get("email", ""),
                "displayName": data.get("displayName", "Fashionista"),
                "totalCreditsUsed": consumed,
                "credits": data.get("credits", 0)
            })
            
        # 3. Most Active Users
        users_list.sort(key=lambda x: x["totalCreditsUsed"], reverse=True)
        most_active_users = users_list[:5]
        
        return {
            "totalRevenue": total_revenue,
            "totalCreditsSold": total_credits_sold,
            "totalCreditsConsumed": total_credits_consumed,
            "mostActiveUsers": most_active_users,
            "revenueByPlan": revenue_by_plan
        }
    except Exception as e:
        print(f"Admin credit analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/admin/users
@router.get("/users", dependencies=[Depends(verify_admin_token)])
async def get_users_list(limit: int = 50, cursor: Optional[str] = None, paginated: bool = Query(False)):
    try:
        users, nextPageToken = firebase_service.get_users_paginated(limit, cursor)
        if paginated:
            return {"users": users, "nextPageToken": nextPageToken}
        return users
    except Exception as e:
        print(f"Admin users error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/admin/users/{uid}/gift
@router.post("/users/{uid}/gift", dependencies=[Depends(verify_admin_token)])
async def gift_user_plan(uid: str, body: Dict[str, Any]):
    plan = body.get("plan")
    duration_days = body.get("durationDays")
    
    if not plan or duration_days is None:
        raise HTTPException(status_code=400, detail="Missing plan or durationDays.")
        
    valid_tiers = ["free", "student", "pro", "business", "enterprise"]
    if plan not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(valid_tiers)}")
        
    try:
        await firebase_service.gift_premium(uid, plan, int(duration_days))
        
        # Log gift in DB
        update_data = {
            "giftedByAdmin": True,
            "giftedDate": datetime.utcnow().isoformat()
        }
        if is_mock:
            await db.collection("users").document(uid).update(update_data)
        else:
            db.collection("users").document(uid).update(update_data)
            
        return {"success": True, "message": f"Gifted {plan} subscription for {duration_days} days."}
    except Exception as e:
        print(f"Admin gift premium error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/admin/users/{uid}/remove-premium
@router.post("/users/{uid}/remove-premium", dependencies=[Depends(verify_admin_token)])
async def remove_premium_plan(uid: str):
    try:
        await firebase_service.update_user_plan(uid, "free")
        return {"success": True, "message": "Premium subscription removed successfully."}
    except Exception as e:
        print(f"Admin remove premium error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/admin/users/{uid}/ban
@router.post("/users/{uid}/ban", dependencies=[Depends(verify_admin_token)])
async def ban_user_endpoint(uid: str, body: Dict[str, Any]):
    is_banned = body.get("isBanned")
    if is_banned is None:
        raise HTTPException(status_code=400, detail="Missing isBanned field in body.")
        
    try:
        await firebase_service.ban_user(uid, bool(is_banned))
        return {"success": True, "message": f"User status set to isBanned: {is_banned}."}
    except Exception as e:
        print(f"Admin ban user error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/admin/affiliate-stats
@router.get("/affiliate-stats", dependencies=[Depends(verify_admin_token)])
async def get_global_affiliate_stats():
    try:
        stats = await firebase_service.get_affiliate_stats()  # no user_id passed -> global
        return {"success": True, "stats": stats}
    except Exception as e:
        print(f"Admin global affiliate stats failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/admin/affiliate-history
@router.get("/affiliate-history", dependencies=[Depends(verify_admin_token)])
async def get_global_affiliate_history(
    limit: int = Query(100, ge=1, le=500),
    cursor: Optional[str] = Query(None)
):
    try:
        history, next_cursor = await firebase_service.get_affiliate_history_paginated(limit=limit, cursor=cursor)  # global
        return {"success": True, "history": history, "nextCursor": next_cursor}
    except Exception as e:
        print(f"Admin global affiliate history failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/admin/affiliate-analytics
@router.get("/affiliate-analytics", dependencies=[Depends(verify_admin_token)])
async def get_global_affiliate_analytics():
    try:
        history = await firebase_service.get_affiliate_history(limit=100)
        
        # 1. Time-series
        daily_map = {}
        now = datetime.utcnow()
        for i in range(29, -1, -1):
            d = now - timedelta(days=i)
            key = d.strftime("%Y-%m-%d")
            daily_map[key] = {"clicks": 0, "conversions": 0, "earnings": 0.0}
            
        # 2. Platform breakdown
        platform_breakdown = {}
        
        # 3. Top products
        product_hits = {}
        
        # 4. Hourly heatmap
        hourly_heatmap = [0] * 24
        
        total_clicks = 0
        total_conversions = 0
        total_earnings = 0.0
        week_clicks = 0
        week_earnings = 0.0
        seven_days_ago = now - timedelta(days=7)
        
        for click in history:
            total_clicks += 1
            ts_str = click.get("timestamp")
            if not ts_str:
                continue
                
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except Exception:
                continue
                
            date_key = ts.strftime("%Y-%m-%d")
            hour = ts.hour
            if 0 <= hour < 24:
                hourly_heatmap[hour] += 1
                
            # Daily fill
            if date_key in daily_map:
                daily_map[date_key]["clicks"] += 1
                
            # Week stats
            if ts.timestamp() >= seven_days_ago.timestamp():
                week_clicks += 1
                
            # Platform
            store = str(click.get("clothingStore") or click.get("platform") or "amazon").lower()
            if store not in platform_breakdown:
                platform_breakdown[store] = {"clicks": 0, "conversions": 0, "earnings": 0.0, "products": []}
            platform_breakdown[store]["clicks"] += 1
            
            # Product aggregation
            clothing_name = click.get("clothingName") or "Unknown item"
            product_key = f"{clothing_name}__{store}"
            if product_key not in product_hits:
                product_hits[product_key] = {
                    "name": clothing_name,
                    "store": store,
                    "price": click.get("clothingPrice", "₹499"),
                    "clicks": 0,
                    "conversions": 0,
                    "earnings": 0.0
                }
            product_hits[product_key]["clicks"] += 1
            
            if click.get("isConverted", False):
                total_conversions += 1
                comm = float(click.get("estimatedCommission") or 0.0)
                total_earnings += comm
                
                if date_key in daily_map:
                    daily_map[date_key]["conversions"] += 1
                    daily_map[date_key]["earnings"] += comm
                    
                if ts.timestamp() >= seven_days_ago.timestamp():
                    week_earnings += comm
                    
                platform_breakdown[store]["conversions"] += 1
                platform_breakdown[store]["earnings"] += comm
                if clothing_name not in platform_breakdown[store]["products"]:
                    platform_breakdown[store]["products"].append(clothing_name)
                    
                product_hits[product_key]["conversions"] += 1
                product_hits[product_key]["earnings"] += comm
                
        # Sort timeseries
        time_series = []
        for k in sorted(daily_map.keys()):
            val = daily_map[k]
            time_series.append({
                "date": k,
                "clicks": val["clicks"],
                "conversions": val["conversions"],
                "earnings": round(val["earnings"], 2)
            })
            
        # Top 10 products
        top_products = list(product_hits.values())
        top_products.sort(key=lambda x: x["clicks"], reverse=True)
        top_products = top_products[:10]
        
        # Monthly projections
        avg_daily = week_earnings / 7 if week_clicks > 0 else 0
        monthly_proj = round(avg_daily * 30, 2)
        yearly_proj = round(avg_daily * 365, 2)
        
        return {
            "success": True,
            "analytics": {
                "summary": {
                    "totalClicks": total_clicks,
                    "totalConversions": total_conversions,
                    "totalEarnings": round(total_earnings, 2),
                    "conversionRate": round((total_conversions / total_clicks * 100), 1) if total_clicks > 0 else 0.0,
                    "weekClicks": week_clicks,
                    "weekEarnings": round(week_earnings, 2),
                    "monthlyProjection": monthly_proj,
                    "yearlyProjection": yearly_proj,
                    "avgOrderValue": round(total_earnings / total_conversions, 2) if total_conversions > 0 else 0.0
                },
                "timeSeries": time_series,
                "platformBreakdown": platform_breakdown,
                "topProducts": top_products,
                "hourlyHeatmap": hourly_heatmap
            }
        }
    except Exception as e:
        print(f"Global affiliate analytics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/admin/affiliate-click
@router.post("/affiliate-click", dependencies=[Depends(verify_admin_token)])
async def admin_affiliate_click(body: Dict[str, Any]):
    user_id = "admin_matrix"
    clothing_name = body.get("clothingName")
    clothing_price = body.get("clothingPrice")
    clothing_store = body.get("clothingStore") or body.get("platform")
    platform = body.get("platform") or body.get("clothingStore")
    product_url = body.get("productUrl")
    
    if not clothing_name or not product_url:
        raise HTTPException(status_code=400, detail="Missing clothingName or productUrl parameters.")
        
    try:
        store = (clothing_store or platform or "amazon").lower()
        
        affiliate_url = product_url
        if "amazon" in store:
            affiliate_url = product_url + ("&" if "?" in product_url else "?") + "tag=tryonx-21"
        elif "flipkart" in store:
            affiliate_url = product_url + ("&" if "?" in product_url else "?") + "affid=tryonx"
        elif "myntra" in store or "ajio" in store:
            affiliate_url = product_url + ("&" if "?" in product_url else "?") + "utm_source=tryonx&utm_medium=affiliate"
        else:
            affiliate_url = product_url + ("&" if "?" in product_url else "?") + "aff=tryonx"
            
        parsed_price = 500
        if clothing_price:
            import re
            cleaned = re.sub(r"[^\d]", "", clothing_price)
            if cleaned:
                parsed_price = int(cleaned)
                
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
        
        import random
        is_converted = random.random() < 0.10
        
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
            
        return {
            "success": True,
            "clickId": click_id,
            "affiliateUrl": affiliate_url,
            "isConverted": is_converted,
            "estimatedCommission": estimated_commission
        }
    except Exception as e:
        print(f"Admin affiliate click error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/admin/activity-feed
@router.get("/activity-feed", dependencies=[Depends(verify_admin_token)])
async def get_activity_feed(limit: int = 20, cursor: Optional[str] = None, paginated: bool = Query(False)):
    try:
        activities, nextPageToken = firebase_service.get_recent_activity_paginated(limit, cursor)
        if paginated:
            return {
                "success": True,
                "activities": activities,
                "nextPageToken": nextPageToken
            }
        return {"success": True, "activities": activities}
    except Exception as e:
        print(f"Fetch activity feed failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
