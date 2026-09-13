import sys
import os
# Insert parent directory to path first so time_patch can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time_patch  # MUST be first after sys.path update
import asyncio
import httpx

# Load dotenv
import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Import Firebase Admin for credentials
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

async def run_hq_test():
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n")
    
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": project_id,
        "private_key": private_key,
        "client_email": client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        
    email = "hq_verification_test@look.ai"
    password = "verificationPassword123"
    
    # Create or get user
    try:
        user = firebase_auth.get_user_by_email(email)
        print("User already exists, UID:", user.uid)
    except Exception:
        user = firebase_auth.create_user(email=email, password=password)
        print("User created successfully, UID:", user.uid)
        
    try:
        # Sign in via Identity Toolkit REST API
        API_KEY = "AIzaSyAkVZFnl0s28iadd0-o-YpappdqudJAYs8"
        async with httpx.AsyncClient(timeout=60.0) as client:
            sign_in_res = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
                json={"email": email, "password": password, "returnSecureToken": True}
            )
            assert sign_in_res.status_code == 200
            user_auth = sign_in_res.json()
            id_token = user_auth["idToken"]
            
            headers = {"Authorization": f"Bearer {id_token}"}
            
            # Submit high quality tryon request
            print("Submitting HQ tryon request...")
            body = {
                "userImageUrl": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=500&h=700&q=80",
                "clothingImageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&h=700&q=80",
                "clothingDescription": "A premium white t-shirt",
                "clothingName": "Premium White T-Shirt",
                "clothingPrice": "₹1299",
                "clothingProductUrl": "https://example.com/item",
                "platform": "flipkart",
                "speedMode": "hq"
            }
            
            res = await client.post(
                "http://127.0.0.1:5000/api/tryon/generate-async",
                headers=headers,
                json=body
            )
            print("Generate-async status:", res.status_code)
            assert res.status_code == 200
            job_info = res.json()
            job_id = job_info["jobId"]
            print("Job ID:", job_id)
            
            # Poll status
            print("Polling status...")
            for i in range(25):
                await asyncio.sleep(2)
                status_res = await client.get(f"http://127.0.0.1:5000/api/tryon/generate-status/{job_id}")
                assert status_res.status_code == 200
                status_data = status_res.json()
                print(f"Poll {i+1}: status={status_data.get('status')}, progress={status_data.get('progress')}%, stage={status_data.get('stage')}")
                if status_data.get("status") in ["SUCCESS", "completed", "failed", "FAILURE"]:
                    print("Task completed! Method/Engine:", status_data.get("result", {}).get("method"), "/", status_data.get("result", {}).get("engine"))
                    print("Result URL:", status_data.get("result", {}).get("resultImageUrl"))
                    break
            else:
                print("Task did not complete in 50 seconds.")
                
    finally:
        # Cleanup
        try:
            firebase_auth.delete_user(user.uid)
            print("Firebase test user deleted.")
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(run_hq_test())
