import httpx
import re
import json
from bs4 import BeautifulSoup

def clean_print(text):
    return text.encode('ascii', 'ignore').decode('ascii')

async def test_scrape_meesho():
    query = "men tshirt"
    url = f"https://www.meesho.com/search?q={query.replace(' ', '%20')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    print(f"Scraping Meesho URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            html = res.text
            print(f"Length of HTML: {len(html)}")
            
            with open("meesho_search.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            # Check if there is a script containing state data in Meesho
            # Meesho usually embeds state in window.__INITIAL_STATE__
            match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.*?});?\s*</script>', html)
            if not match:
                match = re.search(r'window\s*\[\s*["\']__INITIAL_STATE__["\']\s*\]\s*=\s*({.*?});?\s*</script>', html)
                
            if match:
                print("Found window.__INITIAL_STATE__ script block!")
                try:
                    data = json.loads(match.group(1))
                    print(f"Meesho State Keys: {list(data.keys())}")
                except Exception as je:
                    print(f"JSON Parse Exception: {str(je)}")
            else:
                soup = BeautifulSoup(html, "html.parser")
                product_cards = soup.find_all("div", class_=re.compile("ProductCard"))
                print(f"HTML Fallback: Found {len(product_cards)} ProductCard elements")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scrape_meesho())
