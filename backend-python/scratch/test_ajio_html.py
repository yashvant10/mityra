import httpx
import re

url = "https://www.ajio.com/search/?text=men%20blazer"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd"
}
r = httpx.get(url, headers=headers)
print(f"Status: {r.status_code}")
html = r.text
print(f"HTML length: {len(html)}")

match = re.search(r'window\.__PRELOADED_STATE__\s*=\s*({.*?});?\s*</script>', html)
if match:
    print("Found window.__PRELOADED_STATE__")
else:
    match2 = re.search(r'window\s*\[\s*["\']__PRELOADED_STATE__["\']\s*\]\s*=\s*({.*?});?\s*</script>', html)
    if match2:
        print("Found window['__PRELOADED_STATE__']")
    else:
        print("No PRELOADED_STATE found!")
