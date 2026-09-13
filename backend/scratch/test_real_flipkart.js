const axios = require('axios');
const cheerio = require('cheerio');

async function testRealFlipkart() {
  // Let's test searching Google Shopping for a real Flipkart product:
  // e.g. "men cotton shirt flipkart"
  require('dotenv').config({ path: './backend/.env' });
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  const searchRes = await axios.get(`https://real-time-product-search.p.rapidapi.com/search?q=men%20cotton%20shirt%20flipkart&country=in&language=en&page=1`, {
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
    },
    timeout: 10000
  });

  const products = searchRes.data?.data?.products || [];
  console.log('Found search products:', products.length);
  for (const p of products) {
    const url = p.product_page_url || p.offer?.offer_page_url || '';
    if (url.includes('flipkart.com') || p.offer?.store_name?.toLowerCase().includes('flipkart')) {
      console.log('Real Flipkart product found in search:', {
        title: p.product_title,
        price: p.offer?.price,
        photo: p.product_photos?.[0],
        url: url
      });
      break;
    }
  }
}

testRealFlipkart();
