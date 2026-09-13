const url = 'https://www.flipkart.com/the-indian-garage-co-men-striped-casual-shirt/p/itmd043bb22f1837';
fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache'
  }
}).then(async r => {
  const html = await r.text();
  console.log("Status:", r.status);
  const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  const imageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) || html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
  console.log("Title:", titleMatch ? titleMatch[1] : null);
  console.log("Image:", imageMatch ? imageMatch[1] : null);
}).catch(console.error);
