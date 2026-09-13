import asyncio
import httpx
import re
from bs4 import BeautifulSoup

def clean_print(text):
    return text.encode('ascii', 'ignore').decode('ascii')

async def test_scrape_amazon():
    query = "men tshirt"
    url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/"
    }
    
    print(f"Scraping Amazon India URL: {url}")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            html = res.text
            print(f"Length of HTML: {len(html)}")
            
            # Save HTML
            with open("amazon_search.html", "w", encoding="utf-8") as f:
                f.write(html)
                
            soup = BeautifulSoup(html, "html.parser")
            items = soup.find_all("div", {"data-component-type": "s-search-result"})
            print(f"Found {len(items)} s-search-result components!")
            
            products = []
            for idx, item in enumerate(items[:10]):
                # Title
                title_el = item.find("h2")
                title = title_el.text.strip() if title_el else ""
                
                # Image
                img_el = item.find("img", class_="s-image")
                img_url = img_el.get("src") if img_el else ""
                
                # Price
                price_el = item.find("span", class_="a-price-whole")
                price = f"₹{price_el.text.strip()}" if price_el else "₹499"
                
                # Link
                link_el = item.find("a", class_="a-link-normal")
                link = link_el.get("href") if link_el else ""
                if link and not link.startswith("http"):
                    link = "https://www.amazon.in" + link
                
                if title and img_url:
                    products.append({
                        "name": title,
                        "price": price,
                        "image": img_url,
                        "url": link
                    })
                    print(f"{idx+1}. Name: {clean_print(title)[:60]} | Price: {price} | URL: {link[:50]}")
            
            print(f"Total parsed: {len(products)}")
        else:
            print(f"Amazon responded with: {res.status_code}")

if __name__ == "__main__":
    asyncio.run(test_scrape_amazon())
