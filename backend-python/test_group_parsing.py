from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin

def clean_print(text):
    # Safe printing for Windows CP1252 console
    return text.encode('ascii', 'ignore').decode('ascii')

with open("flipkart_search.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
anchors = soup.find_all("a", href=re.compile("/p/"))

# Group elements by their clean product path
product_groups = {}
for a in anchors:
    href = a.get("href") or ""
    # Extract path before query params
    clean_path = href.split("?")[0]
    if not clean_path.startswith("/"):
        continue
    
    if clean_path not in product_groups:
        product_groups[clean_path] = {
            "anchors": [],
            "texts": [],
            "images": []
        }
        
    product_groups[clean_path]["anchors"].append(a)
    
    # Collect non-empty texts
    txt = a.get_text(separator=' ', strip=True)
    if txt:
        product_groups[clean_path]["texts"].append(txt)
        
    # Collect nested images
    for img in a.find_all("img"):
        src = img.get("src")
        if src and src.startswith("http"):
            product_groups[clean_path]["images"].append(src)

parsed_products = []
for path, data in product_groups.items():
    # We need at least an image or a title to consider it a parsed product card
    if not data["images"] and not data["texts"]:
        continue
        
    # Title is typically the longest text inside the collected texts
    title = ""
    if data["texts"]:
        title = max(data["texts"], key=len)
    
    # If title is empty or too short, let's look at neighboring parent text
    # In Flipkart, the title anchor is usually near the brand name and price
    # Let's clean title text
    if not title or len(title) < 5:
        # Check parent elements for longer text
        for a in data["anchors"]:
            p = a.parent
            if p:
                p_text = p.get_text(separator=' ', strip=True)
                if p_text and len(p_text) > len(title):
                    title = p_text
                    
    # Find any price in the parent text
    price = "Rs. 399"
    # Search parent text for Rupee symbol or price patterns
    for a in data["anchors"]:
        p = a.parent
        if p:
            p_text = p.get_text(separator=' ', strip=True)
            # Find price matching ₹ followed by numbers, e.g. ₹399 or ₹1,299 or Rs. 399
            price_match = re.search(r'(?:₹|Rs\.?|INR)\s*([0-9,]+)', p_text)
            if price_match:
                price = f"Rs. {price_match.group(1)}"
                break
            # Fallback regex for pure numbers after a space like " 399"
            nums = re.findall(r'\b[0-9]{3,4}\b', p_text)
            if nums:
                price = f"Rs. {nums[0]}"
                break
                
    img = data["images"][0] if data["images"] else "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500"
    url = urljoin("https://www.flipkart.com", path)
    
    parsed_products.append({
        "name": title,
        "price": price,
        "imageUrl": img,
        "productUrl": url
    })

print(f"Successfully parsed {len(parsed_products)} products!")
for idx, p in enumerate(parsed_products[:6]):
    print(f"{idx+1}. Name: {clean_print(p['name'])} | Price: {p['price']} | URL: {p['productUrl']}")
