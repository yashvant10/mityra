import sys
sys.stdout.reconfigure(encoding='utf-8')
import httpx

url = "http://127.0.0.1:5001/api/tryon/products"
tests = [
    {"store": "amazon", "gender": "female", "category": "dresses", "occasion": "casual", "limit": "3"},
    {"store": "myntra", "gender": "male", "category": "shirts", "occasion": "casual", "limit": "3"},
    {"store": "ajio", "gender": "female", "category": "kurta", "occasion": "casual", "limit": "3"},
]

for params in tests:
    store = params["store"]
    cat = params["category"]
    print(f"\n{'='*60}")
    print(f"Store: {store} | Category: {cat} | Gender: {params['gender']}")
    print(f"{'='*60}")
    try:
        r = httpx.get(url, params=params, timeout=30)
        d = r.json()
        products = d.get("products", [])
        err = d.get("error", "")
        print(f"  Status: {r.status_code} | Products: {len(products)}")
        if err:
            print(f"  Error: {err}")
        for p in products[:2]:
            name = p.get("name", "")[:55]
            price = p.get("price", "")
            img = p.get("imageUrl", "") or p.get("image", "")
            has_img = "YES" if img and img.startswith("http") else "NO"
            print(f"    - {name} | {price} | img={has_img}")
    except Exception as e:
        print(f"  FAILED: {e}")

print("\n\nAll store tests complete!")
