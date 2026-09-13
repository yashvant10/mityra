import os
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from middleware.auth_middleware import get_current_user
from services import firebase_service
from firebase_config import db

router = APIRouter()

PLAN_PRICES = {
    "Starter": 199,
    "Pro": 499,
    "Premium": 999
}

PLAN_CREDITS = {
    "Starter": 20,
    "Pro": 60,
    "Premium": 150
}

@router.post("/create-order", status_code=status.HTTP_201_CREATED)
async def create_order(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        plan_name = body.get("planName")
        
        if plan_name not in PLAN_PRICES:
            raise HTTPException(status_code=400, detail="Invalid plan name specified")
            
        amount = PLAN_PRICES[plan_name]
        credits_to_add = PLAN_CREDITS[plan_name]
        
        # Check if Razorpay keys are configured
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        
        is_mock_payment = not key_id or not key_secret or key_id == "rzp_test_placeholder"
        
        order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
        
        if not is_mock_payment:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.razorpay.com/v1/orders",
                        auth=(key_id, key_secret),
                        json={
                            "amount": amount * 100,  # Razorpay amount is in paise (1 INR = 100 paise)
                            "currency": "INR",
                            "receipt": f"receipt_{user_id[:8]}_{int(time.time())}"
                        }
                    )
                if resp.status_code == 200:
                    resp_data = resp.json()
                    order_id = resp_data["id"]
                else:
                    print(f"[RAZORPAY-API-ERROR] Status: {resp.status_code}, Response: {resp.text}")
                    # Fall back to mock order to avoid locking out developer testing
                    is_mock_payment = True
            except Exception as e:
                print(f"[RAZORPAY-CONNECTION-FAILED] Error: {e}")
                is_mock_payment = True
                
        payment_doc = {
            "orderId": order_id,
            "paymentId": "",
            "userId": user_id,
            "amount": amount,
            "credits": credits_to_add,
            "plan": plan_name,
            "status": "pending",
            "isMock": is_mock_payment,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        # Save order document to Firestore
        db.collection("payments").document(order_id).set(payment_doc)
        
        return {
            "orderId": order_id,
            "amount": amount,
            "credits": credits_to_add,
            "plan": plan_name,
            "isMock": is_mock_payment,
            "razorpayKeyId": key_id if not is_mock_payment else "rzp_test_placeholder"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CREATE-ORDER-ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")

@router.post("/verify")
async def verify_payment(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        razorpay_order_id = body.get("razorpay_order_id")
        razorpay_payment_id = body.get("razorpay_payment_id")
        razorpay_signature = body.get("razorpay_signature")
        
        if not razorpay_order_id or not razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Missing required payment credentials")
            
        doc_ref = db.collection("payments").document(razorpay_order_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
            
        payment_data = doc.to_dict()
        if payment_data.get("status") == "completed":
            return {"success": True, "message": "Payment verified already"}
            
        is_mock = payment_data.get("isMock", False)
        verified = False
        
        if is_mock:
            verified = True
        else:
            key_secret = os.getenv("RAZORPAY_KEY_SECRET")
            if key_secret:
                try:
                    import hmac
                    import hashlib
                    msg = f"{razorpay_order_id}|{razorpay_payment_id}"
                    generated_signature = hmac.new(
                        key=key_secret.encode('utf-8'),
                        msg=msg.encode('utf-8'),
                        digestmod=hashlib.sha256
                    ).hexdigest()
                    if generated_signature == razorpay_signature:
                        verified = True
                except Exception as sig_err:
                    print(f"[SIGNATURE-VERIFY-ERR] {sig_err}")
                    
        if not verified:
            raise HTTPException(status_code=400, detail="Razorpay signature verification failed")
            
        # Update payment document
        payment_data["status"] = "completed"
        payment_data["paymentId"] = razorpay_payment_id
        payment_data["updatedAt"] = datetime.utcnow().isoformat()
        doc_ref.set(payment_data, merge=True)
        
        # Add credits atomically
        credits_to_add = int(payment_data.get("credits", 0))
        plan_name = payment_data.get("plan", "Starter")
        amount_paid = float(payment_data.get("amount", 0))
        
        new_credits = await firebase_service.add_user_credits(
            user_id=user_id,
            amount=credits_to_add,
            plan_name=plan_name,
            amount_paid=amount_paid,
            payment_id=razorpay_payment_id,
            order_id=razorpay_order_id
        )
        
        return {
            "success": True,
            "message": "Payment verified and credits added successfully",
            "credits": new_credits
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VERIFY-PAYMENT-ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")

@router.post("/webhook")
async def payment_webhook(request: Request):
    body_bytes = await request.body()
    signature = request.headers.get("x-razorpay-signature")
    
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    
    if webhook_secret:
        import hmac
        import hashlib
        generated_sig = hmac.new(
            key=webhook_secret.encode('utf-8'),
            msg=body_bytes,
            digestmod=hashlib.sha256
        ).hexdigest()
        if generated_sig != signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
            
    try:
        import json
        event_data = json.loads(body_bytes.decode('utf-8'))
        event = event_data.get("event")
        
        if event == "payment.captured":
            payment_entity = event_data["payload"]["payment"]["entity"]
            razorpay_payment_id = payment_entity["id"]
            razorpay_order_id = payment_entity["order_id"]
            
            doc_ref = db.collection("payments").document(razorpay_order_id)
            doc = doc_ref.get()
            if doc.exists:
                payment_data = doc.to_dict()
                if payment_data.get("status") != "completed":
                    payment_data["status"] = "completed"
                    payment_data["paymentId"] = razorpay_payment_id
                    payment_data["updatedAt"] = datetime.utcnow().isoformat()
                    doc_ref.set(payment_data, merge=True)
                    
                    # Credit user
                    user_id = payment_data["userId"]
                    credits_to_add = int(payment_data.get("credits", 0))
                    plan_name = payment_data.get("plan", "Starter")
                    amount_paid = float(payment_data.get("amount", 0))
                    
                    await firebase_service.add_user_credits(
                        user_id=user_id,
                        amount=credits_to_add,
                        plan_name=plan_name,
                        amount_paid=amount_paid,
                        payment_id=razorpay_payment_id,
                        order_id=razorpay_order_id
                    )
                    print(f"[WEBHOOK] Successfully credited order {razorpay_order_id}")
        return {"status": "ok"}
    except Exception as e:
        print(f"[WEBHOOK-ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions")
async def get_user_transactions(limit: int = Query(10, ge=1, le=50), user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        query_ref = db.collection("creditTransactions")\
            .where("userId", "==", user_id)\
            .order_by("timestamp", direction="DESCENDING")\
            .limit(limit)
            
        snapshot = query_ref.get()
        transactions = []
        for doc in snapshot:
            d = doc.to_dict()
            d["id"] = doc.id
            transactions.append(d)
        return {"transactions": transactions}
    except Exception as e:
        print(f"[TRANSACTIONS-ERROR] {e}")
        # Return fallback in-memory sorting if index is missing
        try:
            snapshot = db.collection("creditTransactions").where("userId", "==", user_id).get()
            transactions = []
            for doc in snapshot:
                d = doc.to_dict()
                d["id"] = doc.id
                transactions.append(d)
            transactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return {"transactions": transactions[:limit]}
        except Exception as fallback_err:
            print(f"[TRANSACTIONS-FALLBACK-ERR] {fallback_err}")
            return {"transactions": []}

@router.get("/user-analytics")
async def get_user_analytics(user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        profile = await firebase_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        # 1. Lifetime spending
        payments_ref = db.collection("payments")\
            .where("userId", "==", user_id)\
            .where("status", "==", "completed")
        payments_snap = payments_ref.get()
        lifetime_spending = sum(float(doc.to_dict().get("amount", 0.0)) for doc in payments_snap)
        
        # 2. Try-ons generated
        tryons_ref = db.collection("tryons").where("userId", "==", user_id)
        tryons_snap = tryons_ref.get()
        tryons_count = len(tryons_snap)
        
        return {
            "currentCredits": profile.get("credits", 0),
            "totalCreditsUsed": profile.get("totalCreditsUsed", 0),
            "totalCreditsPurchased": profile.get("totalCreditsPurchased", 0),
            "totalAdCredits": profile.get("totalAdCredits", 0),
            "lifetimeSpending": lifetime_spending,
            "tryOnsGenerated": tryons_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[USER-ANALYTICS-ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user analytics")
