import httpx
import asyncio

async def test():
    BASE_URL = "http://127.0.0.1:5000"
    async with httpx.AsyncClient() as client:
        # 1. Login
        print("Logging in...")
        res = await client.post(f"{BASE_URL}/api/admin/login", json={
            "username": "yashvant_admin",
            "password": "Look.ai@2026#"
        })
        print("Login status:", res.status_code)
        tokens = res.json()
        access_token = tokens["token"]
        
        # 2. Get dashboard
        print("Requesting dashboard...")
        res = await client.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        print("Dashboard status:", res.status_code)
        print("Dashboard response:")
        print(res.text)

if __name__ == "__main__":
    asyncio.run(test())
