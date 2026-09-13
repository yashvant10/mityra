const axios = require('axios');

async function parseGoogleCache() {
  const productId = '469794965';
  const variant = 'wine';
  const productUrl = `https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/${productId}_${variant}`;
  
  // ─── Google Web Cache ───
  console.log('=== Google Web Cache Parse ===');
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(productUrl)}`;
    const res = await axios.get(cacheUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*',
      },
      timeout: 15000,
    });
    const html = res.data;
    
    // Check for ld+json
    const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
    console.log('ld+json blocks:', ldMatches.length);
    
    // Check for og tags
    const ogImg = html.match(/og:image[^>]*content="([^"]+)"/);
    const ogTitle = html.match(/og:title[^>]*content="([^"]+)"/);
    console.log('og:image:', ogImg ? ogImg[1] : 'NOT FOUND');
    console.log('og:title:', ogTitle ? ogTitle[1] : 'NOT FOUND');
    
    // Check for __PRELOADED_STATE__
    console.log('Has __PRELOADED_STATE__:', html.includes('__PRELOADED_STATE__'));
    
    // Check for product ID
    console.log('Has product ID:', html.includes(productId));
    
    // Search for image URLs matching the product
    const imgUrls = html.match(/https?:\/\/assets[^\s"'<>]+469794965[^\s"'<>]+/g) || [];
    const unique = [...new Set(imgUrls)];
    console.log('\nImage URLs with product ID:');
    unique.forEach(u => console.log('  ', u));
    
    // Search for LP JEANS
    console.log('\nHas LP JEANS:', html.includes('LP JEANS') || html.includes('Lp Jeans'));
    console.log('Has wine:', html.includes(variant));
    
    // Find title tag
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) console.log('Title tag:', titleMatch[1].trim());
    
    // Find price patterns
    const priceMatches = html.match(/₹[\d,]+/g) || [];
    console.log('Prices found:', priceMatches);
    
    // Find any text mentioning the product name
    const namePatterns = html.match(/Men\s+Slim\s+Fit\s+Polo\s+T-Shirt/gi) || [];
    console.log('Product name mentions:', namePatterns.length);
    
    // Show a broader snippet near the product ID  
    const idx = html.indexOf(productId);
    if (idx > -1) {
      console.log('\nContext around product ID:');
      console.log(html.slice(Math.max(0, idx - 200), idx + 200));
    }
    
  } catch(e) {
    console.log('Error:', e.message);
  }
}

parseGoogleCache();
