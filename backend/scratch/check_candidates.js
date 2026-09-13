const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });
const rapidApiKey = process.env.RAPIDAPI_KEY;

async function checkCandidates(query) {
  console.log('\n--- Checking Candidates for:', query);
  const res = await axios.get(`https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(query)}&country=in&language=en&page=1`, {
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
    },
    timeout: 10000
  });
  const products = res.data?.data?.products || [];
  console.log(`Results (${products.length}):`);
  for (let i = 0; i < Math.min(5, products.length); i++) {
    const p = products[i];
    console.log(`[${i}] Title: "${p.product_title}"`);
    console.log(`    URL: ${p.product_page_url || p.offer?.offer_page_url}`);
    console.log(`    Store: ${p.offer?.store_name}`);
    console.log(`    Price: ${p.offer?.price}`);
    console.log(`    Photo: ${p.product_photos?.[0]?.slice(0, 80)}`);
  }
}

async function run() {
  await checkCandidates('highlander men printed casual shirt flipkart');
}

run();
