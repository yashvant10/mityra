import sys
# Apply time patch before any Google/Firebase imports
import time_patch
import os
import time
import asyncio
import httpx
from dotenv import load_dotenv

# Reconfigure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Load env variables from backend-python/.env
load_dotenv(".env")

# Initialize Firebase Admin for helper tasks
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore

project_id = os.getenv("FIREBASE_PROJECT_ID")
client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
private_key = os.getenv("FIREBASE_PRIVATE_KEY")
private_key_formatted = private_key.replace("\\n", "\n")

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": project_id,
    "private_key": private_key_formatted,
    "client_email": client_email,
    "token_uri": "https://oauth2.googleapis.com/token",
})

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

API_KEY = "AIzaSyAkVZFnl0s28iadd0-o-YpappdqudJAYs8"
BASE_URL = "http://127.0.0.1:5000"

async def test_admin_flow():
    print("\n=== STARTING ADMIN FLOW TESTS ===")
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Invalid Login
        print("[TEST] Admin Login - Invalid Credentials...")
        res = await client.post(f"{BASE_URL}/api/admin/login", json={
            "username": "yashvant_admin",
            "password": "wrongpassword"
        })
        print("Status (expect 401):", res.status_code)
        assert res.status_code == 401

        # 2. Valid Login
        print("[TEST] Admin Login - Valid Credentials...")
        res = await client.post(f"{BASE_URL}/api/admin/login", json={
            "username": "yashvant_admin",
            "password": "Look.ai@2026#"
        })
        print("Status (expect 200):", res.status_code)
        assert res.status_code == 200
        tokens = res.json()
        print("Tokens received:", tokens.keys())
        access_token = tokens["token"]
        refresh_token = tokens["refreshToken"]

        # 3. Access Dashboard WITHOUT Token
        print("[TEST] Get Dashboard without Token...")
        res = await client.get(f"{BASE_URL}/api/admin/dashboard")
        print("Status (expect 401):", res.status_code)
        assert res.status_code == 401

        # 4. Access Dashboard WITH Token
        print("[TEST] Get Dashboard with valid JWT...")
        res = await client.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        print("Status (expect 200):", res.status_code)
        assert res.status_code == 200
        print("Dashboard stats count keys:", res.json().keys())

        # 5. Token Refresh
        print("[TEST] Refreshing Admin Token...")
        res = await client.post(f"{BASE_URL}/api/admin/refresh-token", json={
            "refreshToken": refresh_token
        })
        print("Status (expect 200):", res.status_code)
        assert res.status_code == 200
        new_tokens = res.json()
        print("New access token received:", "token" in new_tokens)

async def test_client_flow():
    print("\n=== STARTING CLIENT FLOW TESTS ===")
    
    # Generate / Retrieve Test User
    email = "verification_test_user@look.ai"
    password = "verificationPassword123"
    
    print(f"[TEST] Creating/Retrieving Firebase test user: {email}...")
    try:
        user = firebase_auth.get_user_by_email(email)
        print("User already exists, UID:", user.uid)
    except Exception:
        user = firebase_auth.create_user(email=email, password=password)
        print("User created successfully, UID:", user.uid)
        
    try:
        # Sign in test user via Identity Toolkit REST API
        print("[TEST] Exchanging password for Firebase ID token...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            sign_in_res = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
                json={"email": email, "password": password, "returnSecureToken": True}
            )
            assert sign_in_res.status_code == 200
            user_auth = sign_in_res.json()
            id_token = user_auth["idToken"]
            print("ID token fetched successfully!")

            headers = {"Authorization": f"Bearer {id_token}"}

            # 1. Ownership validation check on Wardrobe update/delete
            # Create a mock wardrobe item in Firestore belonging to ANOTHER user
            print("[TEST] Creating dummy wardrobe item belonging to 'other_user'...")
            item_ref = db.collection("wardrobe").document()
            item_id = item_ref.id
            item_ref.set({
                "userId": "some_other_user_id",
                "name": "Intruder Shirt",
                "imageUrl": "http://example.com/intruder.jpg"
            })
            
            # Try to delete it with our test user token
            print("[TEST] Deleting wardrobe item belonging to someone else (expect 403)...")
            res = await client.delete(
                f"{BASE_URL}/api/wardrobe/{item_id}",
                headers=headers
            )
            print("Status:", res.status_code)
            if res.status_code != 403:
                print("Response body:", res.text)
            assert res.status_code == 403
            
            # Clean up the dummy wardrobe item
            item_ref.delete()

            # 2. Celery Try-On generation submission
            print("[TEST] Submitting async try-on task...")
            body = {
                "userImageUrl": "https://res.cloudinary.com/diakznqmd/image/upload/v17181224186152/dummy_person.png",
                "clothingImageUrl": "https://res.cloudinary.com/diakznqmd/image/upload/v17181224186152/dummy_garment.png",
                "clothingDescription": "A test shirt",
                "clothingName": "Test Shirt",
                "clothingPrice": "₹999",
                "clothingProductUrl": "https://example.com/item",
                "platform": "amazon",
                "speedMode": "fast"
            }
            res = await client.post(
                f"{BASE_URL}/api/tryon/generate-async",
                headers=headers,
                json=body
            )
            print("Status (expect 200):", res.status_code)
            assert res.status_code == 200
            task_info = res.json()
            print("Submission response:", task_info)
            job_id = task_info["jobId"]

            # 3. Poll Celery status
            print("[TEST] Polling task status...")
            for i in range(40):
                await asyncio.sleep(2)
                status_res = await client.get(f"{BASE_URL}/api/tryon/generate-status/{job_id}")
                assert status_res.status_code == 200
                status_data = status_res.json()
                print(f"Poll {i+1}: status={status_data.get('status')}, progress={status_data.get('progress')}%, stage={status_data.get('stage')}")
                if status_data.get("status") in ["SUCCESS", "completed", "failed", "FAILURE"]:
                    print("Task finished with status:", status_data.get("status"))
                    result_obj = status_data.get("result") or {}
                    print("Result URL:", result_obj.get("resultImageUrl") if isinstance(result_obj, dict) else result_obj)
                    break
            else:
                print("Warning: task did not finish in 80 seconds.")

            # 4. Test Firestore caching: submit duplicate request, expect cached response instantly
            print("[TEST] Re-submitting duplicate request (expecting instant cache-hit)...")
            res_dup = await client.post(
                f"{BASE_URL}/api/tryon/generate-async",
                headers=headers,
                json=body
            )
            print("Status (expect 200):", res_dup.status_code)
            assert res_dup.status_code == 200
            dup_info = res_dup.json()
            print("Duplicate submission response:", dup_info)
            assert dup_info.get("cached") is True
            print("SUCCESS! Instant cache-hit verified.")

    finally:
        # Clean up database test user and user's tryon session documents
        print(f"[CLEANUP] Deleting test user {email}...")
        try:
            firebase_auth.delete_user(user.uid)
        except Exception as e:
            print("User deletion failed during cleanup:", e)
            
        print("[CLEANUP] Deleting verify-test tryons from Firestore...")
        try:
            tryons_ref = db.collection("tryons").where("userId", "==", user.uid).get()
            for doc in tryons_ref:
                doc.reference.delete()
            print("Firestore tryon sessions cleaned up.")
        except Exception as e:
            print("Firestore cleanup failed:", e)

async def main():
    await test_admin_flow()
    await test_client_flow()
    print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉")

if __name__ == "__main__":
    asyncio.run(main())
