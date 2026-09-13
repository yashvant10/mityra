import httpx
import re
import json
from bs4 import BeautifulSoup

def clean_print(text):
    return text.encode('ascii', 'ignore').decode('ascii')

async def test_scrape_myntra():
    query = "men tshirt"
    url = f"https://www.myntra.com/{query.replace(' ', '-')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    print(f"Scraping Myntra URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            html = res.text
            print(f"Length of HTML: {len(html)}")
            
            # Save HTML
            with open("myntra_search.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            # In Myntra, product list is stored in a JavaScript window.searchData object inside a script tag!
            # Let's search the HTML for "window.searchData"
            match = re.search(r'window\.searchData\s*=\s*({.*?});?\s*</script>', html)
            if match:
                print("Found window.searchData JSON script block!")
                try:
                    data = json.loads(match.group(1))
                    results = data.get("results", {})
                    products = results.get("products", [])
                    print(f"Parsed {len(products)} products from Myntra JSON data!")
                    for idx, p in enumerate(products[:3]):
                        print(f"{idx+1}. Name: {clean_print(p.get('productName'))} | Price: {p.get('price')} | URL: {p.get('landingPageUrl')}")
                except Exception as je:
                    print(f"JSON Parse Exception: {str(je)}")
            else:
                # Fallback: parse HTML tags
                soup = BeautifulSoup(html, "html.parser")
                products_li = soup.find_all(class_=re.compile("product-base"))
                print(f"HTML Fallback: Found {len(products_li)} product-base items")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scrape_myntra())
