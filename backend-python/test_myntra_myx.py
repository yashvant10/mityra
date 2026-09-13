import re
import json

def clean_print(text):
    return text.encode('ascii', 'ignore').decode('ascii')

with open("myntra_search.html", "r", encoding="utf-8") as f:
    html = f.read()

# Match window.__myx = { ... }
match = re.search(r'window\s*\[\s*["\']__myx["\']\s*\]\s*=\s*({.*?});?\s*</script>', html)
if not match:
    match = re.search(r'window\.__myx\s*=\s*({.*?});?\s*</script>', html)

if match:
    print("Found window.__myx script block!")
    try:
        data = json.loads(match.group(1))
        searchData = data.get("searchData", {})
        results = searchData.get("results", {})
        products = results.get("products", [])
        print(f"Successfully parsed {len(products)} Myntra products!")
        
        for idx, p in enumerate(products[:6]):
            name = p.get("productName") or p.get("name") or "Myntra Item"
            brand = p.get("brand") or ""
            full_name = f"{brand} {name}".strip()
            price = p.get("price")
            # Build direct landing page url
            landing_url = p.get("landingPageUrl")
            if landing_url and not landing_url.startswith("http"):
                landing_url = "https://www.myntra.com/" + landing_url
                
            # Image URL
            img_url = ""
            default_img = p.get("defaultImage") or p.get("image") or {}
            if isinstance(default_img, dict):
                img_url = default_img.get("secureSrc") or default_img.get("src") or ""
            elif isinstance(default_img, str):
                img_url = default_img
                
            if not img_url and p.get("images"):
                imgs = p.get("images")
                if isinstance(imgs, list) and len(imgs) > 0:
                    img_url = imgs[0].get("secureSrc") or imgs[0].get("src") or ""
                    
            print(f"{idx+1}. Name: {clean_print(full_name)} | Price: Rs. {price} | Image: {img_url} | URL: {landing_url}")
            
    except Exception as e:
        print(f"Exception parsing JSON: {str(e)}")
else:
    print("Failed to find window.__myx script block.")
