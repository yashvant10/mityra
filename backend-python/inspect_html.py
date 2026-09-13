from bs4 import BeautifulSoup
import re

with open("flipkart_search.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
anchors = soup.find_all("a", href=re.compile("/p/"))
print(f"Found {len(anchors)} anchors with '/p/'")

# Print first 5 anchors and their nested details
for idx, a in enumerate(anchors[:5]):
    print(f"\n--- Anchor {idx+1} ---")
    print(f"HREF: {a.get('href')}")
    print(f"CLASSES: {a.get('class')}")
    # Print text content inside the anchor or its sibling
    text_content = a.get_text(separator=' | ', strip=True)
    print(f"TEXT CONTENT: {text_content[:200]}")
    # Print nested images
    imgs = a.find_all("img")
    for img in imgs:
        print(f"  IMAGE SRC: {img.get('src')}")
        print(f"  IMAGE ALT: {img.get('alt')}")
