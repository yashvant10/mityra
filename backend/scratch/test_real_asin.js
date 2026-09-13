const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const rapidApiKey = process.env.RAPIDAPI_KEY;

// Real Amazon India ASINs:
// B07XG3Y969 - Symbol Men's Regular Fit T-Shirt
// B0848L4G8P - Symbol Men's Polo
// B08L5WHJ7L - Allen Solly Men's Polo
async function testRealAsin(asin) {
  console.log('\n--- Testing Real Amazon ASIN:', asin);
  try {
    const res = await axios.get(`https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${asin}&country=IN`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
      },
      timeout: 15000
    });
    console.log('Status:', res.status);
    const d = res.data?.data;
    console.log('ASIN in response:', d?.asin);
    console.log('Title:', d?.product_title);
    console.log('Price:', d?.product_price);
    console.log('Photo:', d?.product_photo || d?.product_photos?.[0]);
  } catch (e) {
    console.log('Error:', e.message, e.response?.status, e.response?.data);
  }
}

testRealAsin('B07XG3Y969');
