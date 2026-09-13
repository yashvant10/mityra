require('dotenv').config();
const { parseProductUrl } = require('../dist/services/scraperService');

const urls = [
  'https://www.myntra.com/shirts/highlander/highlander-men-checked-casual-shirt/31086438/buy',
  'https://www.amazon.in/dp/B0HBQGP7FJ',
  'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine',
  'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm535fdb109f6df?pid=SHTGXN8GZHFH79HG',
  'https://www.meesho.com/s/p/1z91u0'
];

(async () => {
  for (const url of urls) {
    const start = Date.now();
    try {
      const res = await parseProductUrl(url);
      console.log(`PASS: ${res.platform} | Time: ${Date.now() - start}ms`);
      console.log(`      Title: ${res.title}`);
      console.log(`      Image: ${res.imageUrl}`);
    } catch (e) {
      console.log(`FAIL: ${url}`);
      console.log(`      Error: ${e.message}`);
    }
  }
})();
