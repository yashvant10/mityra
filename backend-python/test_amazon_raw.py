import asyncio
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def safe_str(val):
    if val is None:
        return "None"
    return str(val).replace("\u20b9", "Rs. ").encode("ascii", "ignore").decode("ascii")

async def test_amazon_raw_price():
    key = os.getenv("RAPIDAPI_KEY")
    host = "real-time-amazon-data.p.rapidapi.com"
    query = "men tshirt"
    from urllib.parse import quote
    url = f"https://{host}/search?query={quote(query)}&country=IN"
    
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
                products = data.get("data", {}).get("products") or []
                print(f"Found {len(products)} products.")
                for idx, p in enumerate(products[:10]):
                    print(f"\nProduct {idx+1}:")
                    print(f"Title: {safe_str(p.get('product_title'))}")
                    print(f"Price Raw: {safe_str(p.get('product_price'))}")
                    print(f"Price Object: {safe_str(p.get('price'))}")
                    print(f"Offer Price: {safe_str(p.get('offer', {}).get('price'))}")
            else:
                print(f"Error Response: {res.text}")
        except Exception as e:
            print(f"Exception: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_amazon_raw_price())
