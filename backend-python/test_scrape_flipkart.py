import httpx
import re
from bs4 import BeautifulSoup

async def test_scrape_flipkart():
    query = "men tshirt"
    url = f"https://www.flipkart.com/search?q={query.replace(' ', '+')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    print(f"Scraping Flipkart URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            html = res.text
            print(f"Length of HTML: {len(html)}")
            
            # Save HTML for inspection
            with open("flipkart_search.html", "w", encoding="utf-8") as f:
                f.write(html)
            
            # Simple parsing using regex or BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")
            
            # Try parsing clothing grid items
            # Flipkart grid items are usually wrapped in anchors or divs with special classes
            # Let's find all product images first
            images = soup.find_all("img", src=re.compile("rukminim"))
            print(f"Found {len(images)} flixcart images")
            
            # Let's search for product cards.
            # In Flipkart, products in grid are often inside divs with class matching `_1sdDpk` or `_7Vw0S` or similar.
            # Let's list some anchors that look like product pages
            anchors = soup.find_all("a", href=re.compile("/p/"))
            print(f"Found {len(anchors)} product anchors")
            
            products = []
            # Let's try parsing grid cards. Each product is typically inside a div/anchor
            # Let's find all anchors with class containing 'IRpwGW' (product title class in Flipkart)
            titles = soup.find_all(class_=re.compile("WriXk2|IRpwGW|r2gSyZ"))
            print(f"Found {len(titles)} titles with common Flipkart classes")
            
            for t in titles[:6]:
                # Try finding product card container
                parent = t.find_parent("a") or t.find_parent("div")
                if not parent:
                    continue
                
                # Try finding image
                img_el = parent.find("img") or (parent.find_parent("div") and parent.find_parent("div").find("img"))
                img_url = img_el.get("src") if img_el else ""
                
                # Try finding price
                price_el = None
                if parent.find_parent("div"):
                    price_el = parent.find_parent("div").find(class_=re.compile("Nx9w7m|_30jeq3"))
                price = price_el.text if price_el else "₹399"
                
                # Try finding product link
                link = parent.get("href") or ""
                if link and not link.startswith("http"):
                    link = "https://www.flipkart.com" + link
                    
                products.append({
                    "name": t.text,
                    "price": price,
                    "image": img_url,
                    "url": link
                })
                
            print(f"Parsed {len(products)} products:")
            for p in products:
                print(p)
                
if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scrape_flipkart())
