import asyncio
import httpx
import time_patch # noqa
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore
import os
from dotenv import load_dotenv

load_dotenv(".env")

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

async def test_delete_http():
    email = "delete_test_user@look.ai"
    password = "verificationPassword123"
    
    # Get or create user
    try:
        user = firebase_auth.get_user_by_email(email)
    except Exception:
        user = firebase_auth.create_user(email=email, password=password)
        
    try:
        # Get ID token
        async with httpx.AsyncClient() as client:
            sign_in_res = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
                json={"email": email, "password": password, "returnSecureToken": True}
            )
            id_token = sign_in_res.json()["idToken"]
            
            # Create a dummy wardrobe item owned by someone else
            item_ref = db.collection("wardrobe").document()
            item_id = item_ref.id
            item_ref.set({
                "userId": "some_other_user_id",
                "name": "Intruder Shirt",
                "imageUrl": "http://example.com/intruder.jpg"
            })
            
            headers = {"Authorization": f"Bearer {id_token}"}
            print(f"Sending delete for item {item_id} (owned by some_other_user_id) with user {user.uid} token")
            res = await client.delete(f"{BASE_URL}/api/wardrobe/{item_id}", headers=headers)
            print("Status code:", res.status_code)
            print("Response body:", res.text)
            
            item_ref.delete()
            
    finally:
        try:
            firebase_auth.delete_user(user.uid)
        except Exception:
            pass

asyncio.run(test_delete_http())
