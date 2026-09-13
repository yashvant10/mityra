require('dotenv').config();
const { parseProductUrl } = require('../dist/services/scraperService');

const urls = {
  myntra: 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/2164324/buy',
  amazon: 'https://www.amazon.in/dp/B082P88H4Z',
  ajio: 'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine?user=old&itm_source=banner&itm_source_detail=NA',
  flipkart: 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm28e833fb3d001?pid=SHTGXN8GZHFH79HG',
  meesho: 'https://www.meesho.com/classic-men-tshirts/p/1z91u0'
};

async function testOne(name, url) {
  console.log(`\n================== TESTING: ${name.toUpperCase()} ==================`);
  console.log(`URL: ${url}`);
  const start = Date.now();
  try {
    const result = await parseProductUrl(url);
    const duration = Date.now() - start;
    console.log(`Time: ${duration}ms`);
    console.log(`Result:`, {
      platform: result.platform,
      title: result.title,
      price: result.price,
      imageUrl: result.imageUrl?.slice(0, 100),
      url: result.url,
      brand: result.brand,
      productId: result.productId,
      variant: result.variant
    });
    return { name, success: true, duration, result };
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAILED after ${duration}ms: ${err.message}`);
    return { name, success: false, duration, error: err.message };
  }
}

async function runAll() {
  for (const [name, url] of Object.entries(urls)) {
    await testOne(name, url);
  }
}

runAll();
