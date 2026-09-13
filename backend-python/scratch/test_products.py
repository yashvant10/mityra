import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import httpx
import json

url = "http://127.0.0.1:5001/api/tryon/products"
params = {
    "store": "flipkart",
    "gender": "male",
    "category": "tshirts",
    "occasion": "casual",
    "limit": "4"
}

print(f"Testing: {url}")
try:
    r = httpx.get(url, params=params, timeout=30)
    print(f"Status: {r.status_code}")
    d = r.json()
    products = d.get("products", [])
    print(f"Products returned: {len(products)}")
    for i, p in enumerate(products):
        name = p.get("name", "") or p.get("title", "")
        price = p.get("price", "")
        img = p.get("imageUrl", "") or p.get("image", "")
        store = p.get("store", "")
        url_link = p.get("productUrl", "")
        print(f"  [{i+1}] {name[:60]}")
        print(f"       Price: {price} | Store: {store}")
        print(f"       Image: {img[:100]}")
        print(f"       URL: {url_link[:100]}")
        print()
    if d.get("error"):
        print(f"ERROR: {d['error']}")
    
    # Verify image URLs are accessible
    print("--- Image URL Validation ---")
    for i, p in enumerate(products[:2]):
        img = p.get("imageUrl", "") or p.get("image", "")
        if img:
            try:
                ir = httpx.head(img, timeout=10, follow_redirects=True)
                print(f"  [{i+1}] Image status: {ir.status_code} | Content-Type: {ir.headers.get('content-type', 'N/A')}")
            except Exception as e:
                print(f"  [{i+1}] Image FAILED: {e}")
except Exception as e:
    print(f"Request failed: {e}")
    import traceback
    traceback.print_exc()
