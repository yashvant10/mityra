import asyncio
import os
import sys
from services import rapidapi_service

def safe_print(text):
    print(str(text).encode('ascii', errors='replace').decode('ascii'))

async def test_scrapers():
    stores = ["amazon", "flipkart", "myntra", "ajio", "meesho"]
    gender = "male"
    category = "T-Shirts"
    occasion = "Casual"
    
    safe_print("=== TESTING DIRECT SCRAPERS & ROUTING ===")
    for store in stores:
        safe_print(f"\n--- Testing Store: {store} ---")
        try:
            products = await rapidapi_service.search_real_products(
                store=store,
                gender=gender,
                occasion=occasion,
                category=category
            )
            safe_print(f"Result count: {len(products)}")
            if products:
                sample = products[0]
                safe_print(f"Sample Product:")
                safe_print(f"  ID: {sample.get('id')}")
                safe_print(f"  Title: {sample.get('title')}")
                safe_print(f"  Price: {sample.get('price')}")
                safe_print(f"  ImageUrl: {sample.get('imageUrl')}")
                safe_print(f"  Store: {sample.get('store')}")
                safe_print(f"  ProductUrl: {sample.get('productUrl')}")
                safe_print(f"  AffiliateUrl: {sample.get('affiliateUrl')}")
            else:
                safe_print("No products returned.")
        except Exception as e:
            import traceback
            traceback.print_exc()
            safe_print(f"Failed for {store}: {e}")

if __name__ == "__main__":
    asyncio.run(test_scrapers())
