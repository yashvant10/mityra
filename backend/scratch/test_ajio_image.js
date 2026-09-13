require('dotenv').config();
const axios = require('axios');

async function findAjioImage() {
  const productId = '469794965';
  const variant = 'wine';
  const rapidKey = (process.env.RAPIDAPI_KEY || process.env.REACT_APP_RAPIDAPI_KEY || '').trim();
  console.log('RapidAPI key available:', rapidKey.length > 5);
  
  // Approach 1: Search Google Shopping with exact product details
  if (rapidKey) {
    console.log('\n=== Google Shopping searches ===');
    const queries = [
      `site:ajio.com 469794965 wine polo`,
      `ajio 469794965_wine LP JEANS polo t-shirt`,
      `"469794965" ajio LP JEANS`,
      `LP JEANS polo t-shirt wine ajio`,
    ];
    
    for (const q of queries) {
      try {
        const searchUrl = `https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(q)}&country=in&language=en&page=1`;
        console.log(`\nQuery: "${q}"`);
        const res = await axios.get(searchUrl, {
          headers: {
            'x-rapidapi-key': rapidKey,
            'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
          },
          timeout: 15000
        });
        const products = res.data?.data?.products || [];
        console.log(`Results: ${products.length}`);
        products.slice(0, 5).forEach((p, i) => {
          const url = p.product_page_url || '';
          const hasId = url.includes(productId);
          const photos = p.product_photos || [];
          console.log(`[${i}] ${hasId ? '✓ ID MATCH' : '✗'} "${(p.product_title || '').slice(0, 80)}"`);
          console.log(`    URL: ${url.slice(0, 130)}`);
          if (photos[0]) console.log(`    Image: ${photos[0].slice(0, 130)}`);
        });
        
        // If we found a match with exact ID, stop
        const match = products.find(p => (p.product_page_url || '').includes(productId));
        if (match) {
          console.log('\n=== FOUND EXACT MATCH ===');
          console.log('Title:', match.product_title);
          console.log('URL:', match.product_page_url);
          console.log('Image:', (match.product_photos || [])[0]);
          return;
        }
      } catch(e) {
        console.log('Error:', e.message);
      }
    }
  }
}

findAjioImage();
