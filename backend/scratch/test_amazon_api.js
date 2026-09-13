const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const rapidApiKey = process.env.RAPIDAPI_KEY;

async function testSearchAmazon() {
  console.log('\n--- 1. Testing real-time-amazon-data search:');
  try {
    const res = await axios.get(`https://real-time-amazon-data.p.rapidapi.com/search?query=mens%20shirt&country=IN&page=1`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
      },
      timeout: 10000
    });
    const items = res.data?.data?.products || [];
    console.log('Search returned items:', items.length);
    if (items.length > 0) {
      console.log('First item:', {
        asin: items[0].asin,
        title: items[0].product_title,
        price: items[0].product_price,
        photo: items[0].product_photo
      });

      // Now test product-details on this real ASIN!
      console.log('\n--- 2. Testing product-details on valid ASIN:', items[0].asin);
      const detailRes = await axios.get(`https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${items[0].asin}&country=IN`, {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
        },
        timeout: 10000
      });
      console.log('Detail ASIN result:', {
        asin: detailRes.data?.data?.asin,
        title: detailRes.data?.data?.product_title,
        photo: detailRes.data?.data?.product_photo
      });
    }
  } catch (e) {
    console.log('Error:', e.message, e.response?.data);
  }
}

testSearchAmazon();
