const axios = require('axios');

async function testAjioFetch() {
  const productUrl = 'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine';
  
  // 1. Try direct fetch with mobile UA
  console.log('=== TEST 1: Direct fetch with mobile UA ===');
  try {
    const res = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5,
      timeout: 15000,
      validateStatus: () => true
    });
    
    const html = typeof res.data === 'string' ? res.data : '';
    console.log('Status:', res.status);
    console.log('HTML length:', html.length);
    console.log('Has __PRELOADED_STATE__:', html.includes('__PRELOADED_STATE__'));
    console.log('Has og:image:', html.includes('og:image'));
    console.log('Has og:title:', html.includes('og:title'));
    console.log('Has ld+json:', html.includes('application/ld+json'));
    console.log('Has 469794965:', html.includes('469794965'));
    console.log('Has LP JEANS:', html.includes('LP JEANS') || html.includes('lp jeans') || html.includes('Lp Jeans'));
    console.log('Has wine:', html.includes('wine') || html.includes('Wine'));
    
    // Extract og tags
    const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/);
    const ogTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/);
    if (ogImg) console.log('og:image:', ogImg[1]);
    if (ogTitle) console.log('og:title:', ogTitle[1]);
    
    // Check for ld+json
    const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    if (ldMatches) {
      console.log('ld+json blocks:', ldMatches.length);
      ldMatches.forEach((m, i) => {
        try {
          const jsonStr = m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const json = JSON.parse(jsonStr);
          console.log(`ld+json [${i}]:`, JSON.stringify(json).slice(0, 500));
        } catch(e) {
          console.log(`ld+json [${i}] parse error`);
        }
      });
    }

    // Check for __PRELOADED_STATE__
    const preloadMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (preloadMatch) {
      console.log('__PRELOADED_STATE__ found, length:', preloadMatch[1].length);
      try {
        const state = JSON.parse(preloadMatch[1]);
        console.log('State keys:', Object.keys(state));
      } catch(e) {
        console.log('Failed to parse state');
      }
    }
    
    // Show title tag
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) console.log('Title tag:', titleMatch[1].trim());
    
    // Show first 500 chars
    console.log('\nHTML sample (first 500):', html.slice(0, 500));
  } catch(e) {
    console.error('Test 1 error:', e.message);
  }
  
  // 2. Try ScrapingDog if API key exists
  const sdKey = process.env.SCRAPINGDOG_API_KEY;
  if (sdKey) {
    console.log('\n=== TEST 2: ScrapingDog fetch ===');
    try {
      const scrapeUrl = `https://api.scrapingdog.com/scrape?api_key=${sdKey}&url=${encodeURIComponent(productUrl)}&dynamic=true`;
      const res = await axios.get(scrapeUrl, { timeout: 20000 });
      const html = typeof res.data === 'string' ? res.data : '';
      console.log('ScrapingDog status:', res.status, 'HTML length:', html.length);
      console.log('Has 469794965:', html.includes('469794965'));
      console.log('Has og:image:', html.includes('og:image'));
    } catch(e) {
      console.log('ScrapingDog error:', e.message);
    }
  }

  // 3. Try AJIO mobile API 
  console.log('\n=== TEST 3: AJIO mobile/BFF API endpoints ===');
  const apiUrls = [
    'https://www.ajio.com/api/p/469794965_wine',
    'https://www.ajio.com/api/p/469794965_wine?fields=FULL',
    'https://www.ajio.com/api/product/469794965_wine',
    'https://www.ajio.com/api/search?text=469794965&curated=true',
    'https://www.ajio.com/api/v2/products/469794965_wine',
    'https://www.ajio.com/api/p/469794965_wine?reqPlatform=desktop&qs=',
  ];
  
  for (const u of apiUrls) {
    try {
      const res = await axios.get(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.ajio.com/',
          'Origin': 'https://www.ajio.com',
        },
        timeout: 8000,
        validateStatus: () => true
      });
      console.log(`[${res.status}] ${u}`);
      if (res.status === 200 && typeof res.data === 'object') {
        console.log('  Keys:', Object.keys(res.data).join(', '));
        if (res.data.name) console.log('  name:', res.data.name);
        if (res.data.baseOptions) console.log('  baseOptions present');
        if (res.data.fnlColorVariantData) console.log('  fnlColorVariantData present');
        if (res.data.images) console.log('  images:', JSON.stringify(res.data.images).slice(0, 200));
      }
    } catch(e) {
      console.log(`[ERR] ${u}: ${e.message}`);
    }
  }
  
  // 4. Try Google cache via Jina
  console.log('\n=== TEST 4: Google Cache / Web Cache ===');
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine`;
    const res = await axios.get(cacheUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
      validateStatus: () => true
    });
    console.log('Google Cache status:', res.status);
    const html = typeof res.data === 'string' ? res.data : '';
    console.log('Has 469794965:', html.includes('469794965'));
    if (html.includes('469794965')) {
      console.log('Google Cache has product ID! Length:', html.length);
    }
  } catch(e) {
    console.log('Google Cache error:', e.message);
  }
}

testAjioFetch();
