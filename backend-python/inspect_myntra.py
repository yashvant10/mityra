import re

with open("myntra_search.html", "r", encoding="utf-8") as f:
    html = f.read()

print("Searching for patterns inside myntra_search.html:")
# Let's find script tags containing searchData or products
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Found {len(scripts)} script tags")

for idx, s in enumerate(scripts):
    if "searchData" in s or "pdpData" in s or "results" in s or "productName" in s or "landingPageUrl" in s:
        print(f"\n--- Script Tag {idx+1} contains matching keywords! ---")
        print(f"Length of script content: {len(s)}")
        # Print a sample
        print(s[:500])
        # Find exact matches
        matches = re.findall(r'window\s*\[\s*["\']searchData["\']\s*\]\s*=\s*({.*?})', s)
        if not matches:
            matches = re.findall(r'window\.searchData\s*=\s*({.*?})', s)
        if matches:
            print("Found window.searchData assignment!")
            print(f"JSON Length: {len(matches[0])}")
            print(matches[0][:300])
