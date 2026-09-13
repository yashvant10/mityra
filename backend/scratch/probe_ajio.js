const axios = require('axios');

const endpoints = [
  'https://www.ajio.com/api/search?text=703847572',
  'https://www.ajio.com/api/search?text=703847572_beige',
  'https://www.ajio.com/api/search/suggestions?text=703847572',
  'https://www.ajio.com/api/p/703847572_beige?query=703847572',
  'https://www.ajio.com/api/product/703847572_beige',
  'https://www.ajio.com/api/product/v1/703847572_beige',
  'https://www.ajio.com/api/product/v2/703847572_beige',
  'https://www.ajio.com/api/pdp/703847572_beige',
  'https://www.ajio.com/api/curated/703847572_beige',
  'https://www.ajio.com/api/product-details/703847572_beige',
  'https://m.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige',
  'https://m.ajio.com/api/p/703847572_beige',
  'https://m.ajio.com/api/product/703847572_beige',
  'https://www.ajio.com/api/product/703847572/pdp',
  'https://www.ajio.com/api/products/703847572_beige',
  'https://www.ajio.com/api/catalog/products/703847572_beige',
  'https://www.ajio.com/api/catalog/product/703847572_beige',
  'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige.json',
  'https://www.ajio.com/p/703847572_beige.json',
  'https://assets.ajio.com/medias/sys_master/root/703847572_beige.jpg'
];

async function probe() {
  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`[${res.status}] ${ep} (type: ${res.headers['content-type']}, len: ${typeof res.data === 'string' ? res.data.length : JSON.stringify(res.data).length})`);
      if (res.status === 200 && typeof res.data === 'object') {
        console.log('  -> JSON response keys:', Object.keys(res.data));
      }
    } catch (e) {
      console.log(`[ERR] ${ep}: ${e.message}`);
    }
  }
}

probe();
