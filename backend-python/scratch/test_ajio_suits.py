import sys
import httpx
import json

sys.stdout.reconfigure(encoding='utf-8')
url = "http://127.0.0.1:5001/api/tryon/products"

params = {
    "store": "ajio",
    "gender": "male",
    "category": "suits",
    "subcategory": "formal",
    "occasion": "interview",
    "limit": "10",
    "q": "men formal suits interview"
}

print(f"Testing: {url} with params {params}")
try:
    r = httpx.get(url, params=params, timeout=60)
    print(f"Status: {r.status_code}")
    d = r.json()
    products = d.get("products", [])
    print(f"Products returned: {len(products)}")
    for i, p in enumerate(products):
        print(f"  [{i+1}] {p.get('name', '')[:50]} | {p.get('store')} | {p.get('imageUrl', '')[:60]}")
except Exception as e:
    print(f"Error: {e}")
