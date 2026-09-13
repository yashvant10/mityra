import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.rapidapi_service import search_real_products

async def test():
    print("Testing RapidAPI product search for Flipkart...")
    print(f"RAPIDAPI_KEY = '{os.getenv('RAPIDAPI_KEY')}'")
    try:
        products = await search_real_products(
            store="flipkart",
            gender="male",
            occasion="Casual",
            category="T-Shirts"
        )
        print(f"Success! Found {len(products)} products:")
        for idx, p in enumerate(products):
            print(f"{idx+1}. {p['name']} | Price: {p['price']} | Store: {p['store']} | URL: {p['productUrl']}")
    except Exception as e:
        print(f"Failed to fetch products: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test())
