import asyncio
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_multi_store(site: str):
    key = os.getenv("RAPIDAPI_KEY")
    host = "realtime-flipkart-amazon-myntra-ajio-croma-product-details.p.rapidapi.com"
    query = "men tshirt"
    from urllib.parse import quote
    url = f"https://{host}/search?query={quote(query)}&site={site}"
    
    print(f"\n--- Testing site='{site}' on Multi-Store API ---")
    print(f"URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(url, headers={
                "x-rapidapi-key": key,
                "x-rapidapi-host": host
            })
            print(f"Status Code: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                # Print sample of products
                products = data.get("data", {}).get("products") or data.get("products") or data.get("data") or []
                print(f"Success! Found {len(products)} products.")
                if len(products) > 0:
                    print("Sample product:")
                    print(products[0])
            else:
                print(f"Error Response: {res.text}")
        except Exception as e:
            print(f"Exception: {str(e)}")

async def test_amazon():
    key = os.getenv("RAPIDAPI_KEY")
    host = "real-time-amazon-data.p.rapidapi.com"
    query = "men tshirt"
    from urllib.parse import quote
    url = f"https://{host}/search?query={quote(query)}&country=IN"
    
    print(f"\n--- Testing Amazon API ---")
    print(f"URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(url, headers={
                "x-rapidapi-key": key,
                "x-rapidapi-host": host
            })
            print(f"Status Code: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                products = data.get("data", {}).get("products") or data.get("products") or data.get("data") or []
                print(f"Success! Found {len(products)} products.")
            else:
                print(f"Error Response: {res.text}")
        except Exception as e:
            print(f"Exception: {str(e)}")

async def main():
    await test_multi_store("flipkart")
    await test_multi_store("myntra")
    await test_multi_store("ajio")
    await test_amazon()

if __name__ == "__main__":
    asyncio.run(main())
