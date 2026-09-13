import asyncio
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_flipkart_api():
    key = os.getenv("RAPIDAPI_KEY")
    host = "real-time-flipkart-data2.p.rapidapi.com"
    
    # Try different endpoints
    endpoints = [
        "/search?q=men+tshirt",
        "/search?query=men+tshirt",
        "/search-products?q=men+tshirt",
        "/search?keyword=men+tshirt",
        "/products?q=men+tshirt"
    ]
    
    for ep in endpoints:
        url = f"https://{host}{ep}"
        print(f"\n--- Testing Endpoint: {ep} ---")
        print(f"URL: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(url, headers={
                    "x-rapidapi-key": key,
                    "x-rapidapi-host": host
                })
                print(f"Status Code: {res.status_code}")
                if res.status_code == 200:
                    data = res.json()
                    print("Success! Response sample:")
                    print(str(data)[:300])
                    break
                else:
                    print(f"Response: {res.text}")
            except Exception as e:
                print(f"Exception: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_flipkart_api())
