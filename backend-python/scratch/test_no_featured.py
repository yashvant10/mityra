import sys
sys.stdout.reconfigure(encoding='utf-8')
import httpx

url = "http://127.0.0.1:5001/api/tryon/products"

# Test 1: Normal product fetch - should return REAL products only, no isFeatured
print("=== Test 1: Real products only (no featured) ===")
r = httpx.get(url, params={"store": "flipkart", "gender": "male", "category": "tshirts", "occasion": "casual", "limit": "4"}, timeout=30)
d = r.json()
products = d.get("products", [])
print(f"Products: {len(products)}")
featured_count = sum(1 for p in products if p.get("isFeatured"))
print(f"Featured count: {featured_count} (should be 0)")
unsplash_count = sum(1 for p in products if "unsplash.com" in (p.get("imageUrl", "") or ""))
print(f"Unsplash images: {unsplash_count} (should be 0)")
for p in products[:3]:
    name = p.get("name", "")[:50]
    img = p.get("imageUrl", "")[:60]
    featured = p.get("isFeatured", False)
    print(f"  - {name} | featured={featured} | img={img}")

# Test 2: Verify all products have real store images (not unsplash)
print("\n=== Test 2: Amazon products ===")
r2 = httpx.get(url, params={"store": "amazon", "gender": "female", "category": "dresses", "occasion": "casual", "limit": "3"}, timeout=30)
d2 = r2.json()
products2 = d2.get("products", [])
print(f"Products: {len(products2)}")
for p in products2[:3]:
    name = p.get("name", "")[:50]
    img = p.get("imageUrl", "")[:60]
    is_real = "flipkart" in img or "amazon" in img or "myntra" in img or "ajio" in img or "meesho" in img or "rukminim" in img or "m.media-amazon" in img or "assets.myntassets" in img
    print(f"  - {name} | real_img={is_real} | img={img}")

print("\n=== RESULT ===")
if featured_count == 0 and unsplash_count == 0:
    print("PASS: No fake/featured products. All real data only!")
else:
    print("FAIL: Still has fake/featured products!")
