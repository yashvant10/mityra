const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/PROJECT_COMPLETE_BACKUP/backend/.env' });

const apiKey = process.env.RAPIDAPI_KEY;

async function testRapidApi() {
  const queries = [
    '703847572 ajio',
    '703847572_beige',
    'neonomad 703847572',
    'neonomad men regular fit spread collar shirt beige ajio',
    'neonomad spread collar shirt beige',
    'neonomad shirt beige ajio',
    'neonomad men regular fit spread collar shirt ajio'
  ];

  for (const q of queries) {
    console.log(`\n=== QUERY: "${q}" ===`);
    try {
      const searchUrl = `https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(q)}&country=in&language=en&page=1`;
      const res = await axios.get(searchUrl, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
        },
        timeout: 10000
      });
      const products = res.data?.data?.products || [];
      console.log(`Results: ${products.length}`);
      for (const p of products.slice(0, 5)) {
        console.log(`- Title: "${p.product_title}"`);
        console.log(`  Store: "${p.offer?.store_name}" | Price: "${p.offer?.price}"`);
        console.log(`  Photo: "${p.product_photos?.[0]}"`);
        console.log(`  Link: "${p.product_page_url?.slice(0, 100)}"`);
        console.log(`  Offer link: "${p.offer?.offer_page_url?.slice(0, 100)}"`);
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

testRapidApi();
