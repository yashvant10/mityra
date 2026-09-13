const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const rapidApiKey = process.env.RAPIDAPI_KEY;
console.log('RapidAPI Key present:', !!rapidApiKey);

async function testAmazonAsin(asin) {
  console.log('\n--- Testing Amazon ASIN:', asin);
  try {
    const res = await axios.get(`https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${asin}&country=IN`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
      },
      timeout: 10000
    });
    const d = res.data?.data;
    console.log('Amazon Status:', res.status);
    console.log('Amazon Product Title:', d?.product_title);
    console.log('Amazon Product Price:', d?.product_price);
    console.log('Amazon Photo:', d?.product_photo || d?.product_photos?.[0]);
  } catch (e) {
    console.error('Amazon ASIN error:', e.message, e.response?.data);
  }
}

async function testMyntraNative(url) {
  console.log('\n--- Testing Myntra Native Scrape:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('Myntra HTTP status:', res.status);
    const html = res.data;
    const pdpDataMatch = html.match(/<script>window\.__myx\s*=\s*({.*?})<\/script>/s) || html.match(/pdpData\s*=\s*({.*?});/s);
    if (pdpDataMatch) {
      console.log('Found pdpData in script!');
    } else {
      console.log('pdpData script not matched directly, checking length:', html.length);
    }
  } catch (e) {
    console.error('Myntra error:', e.message);
  }
}

async function run() {
  await testAmazonAsin('B082BGVTDM');
  await testMyntraNative('https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/2164324/buy');
}

run();
