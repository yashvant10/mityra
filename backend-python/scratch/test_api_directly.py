import sys
import os

# Insert backend directory into path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load dotenv
import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import time_patch
from fastapi.testclient import TestClient
from main import app

def test():
    client = TestClient(app)
    
    # 1. Login
    print("Logging in...")
    res = client.post("/api/admin/login", json={
        "username": "yashvant_admin",
        "password": "Look.ai@2026#"
    })
    print("Login status:", res.status_code)
    tokens = res.json()
    access_token = tokens["token"]
    
    # 2. Get dashboard
    print("Requesting dashboard...")
    res = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print("Dashboard status:", res.status_code)
    print("Dashboard response:", res.text)

if __name__ == "__main__":
    test()
