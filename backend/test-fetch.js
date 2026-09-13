const url = "https://www.amazon.in/Allen-Solly-Regular-Fit-Shirt-ASSFCM2F529949_Green_40/dp/B0B63P6952";

async function testFetch() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await res.text();
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    
    console.log("Title:", titleMatch ? titleMatch[1] : null);
    console.log("Image:", imageMatch ? imageMatch[1] : null);
    console.log("Desc:", descMatch ? descMatch[1] : null);
  } catch (e) {
    console.error(e);
  }
}

testFetch();
