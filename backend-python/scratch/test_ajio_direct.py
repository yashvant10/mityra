import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from services.rapidapi_service import scrape_ajio_direct

async def main():
    print("Testing AJIO scraper directly...")
    products = await scrape_ajio_direct("male", "men blazer")
    print(f"Result count: {len(products)}")
    for i, p in enumerate(products[:3]):
        print(f"[{i+1}] {p.get('name')}")

if __name__ == "__main__":
    asyncio.run(main())
