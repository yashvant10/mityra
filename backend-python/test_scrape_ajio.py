import httpx
import re
import json
from bs4 import BeautifulSoup

def clean_print(text):
    return text.encode('ascii', 'ignore').decode('ascii')

async def test_scrape_ajio():
    query = "men tshirt"
    url = f"https://www.ajio.com/search/?text={query.replace(' ', '%20')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }
    
    print(f"Scraping Ajio URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0, http2=True) as client:
        res = await client.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            html = res.text
            print(f"Length of HTML: {len(html)}")
            
            # Save HTML
            with open("ajio_search.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            # In Ajio, the products are usually inside a JSON object stored in a script tag as window.__PRELOADED_STATE__
            match = re.search(r'window\.__PRELOADED_STATE__\s*=\s*({.*?});?\s*</script>', html)
            if not match:
                match = re.search(r'window\s*\[\s*["\']__PRELOADED_STATE__["\']\s*\]\s*=\s*({.*?});?\s*</script>', html)
                
            if match:
                print("Found window.__PRELOADED_STATE__ script block!")
                try:
                    data = json.loads(match.group(1))
                    # Let's inspect some keys to find products
                    print(f"Preloaded State Keys: {list(data.keys())}")
                    
                    # Usually Ajio products are in searchResponse or grid results
                    search_resp = data.get("grid", {}).get("results", []) or data.get("searchResponse", {}).get("products", [])
                    print(f"Found {len(search_resp)} items in grid or searchResponse")
                except Exception as je:
                    print(f"JSON exception: {str(je)}")
            else:
                # Fallback to BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                items = soup.find_all(class_=re.compile("product-item|item"))
                print(f"HTML Fallback: Found {len(items)} product-item elements")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scrape_ajio())
