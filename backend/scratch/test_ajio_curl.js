const { execSync } = require('child_process');
const axios = require('axios');

async function testAjioFetch() {
  const url = 'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine';
  
  // Test curl
  try {
    const curlOut = execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" "${url}"`, { maxBuffer: 5 * 1024 * 1024 }).toString();
    console.log('Curl output len:', curlOut.length);
    if (curlOut.includes('469794965')) {
      console.log('✓ Curl output contains product ID!');
      const m = curlOut.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
      console.log('JSON-LD count:', m ? m.length : 0);
      const ogImg = curlOut.match(/property="og:image"[^>]*content="([^"]+)"/);
      console.log('og:image:', ogImg ? ogImg[1] : 'none');
    } else {
      console.log('Curl output snippet:', curlOut.slice(0, 300));
    }
  } catch (e) {
    console.log('Curl error:', e.message);
  }
}

testAjioFetch();
