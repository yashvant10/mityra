require('dotenv').config();

async function testMyntraScrapingDog() {
  console.log('--- STARTING MYNTRA SCRAPINGDOG TEST ---');
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    console.error('FAIL: SCRAPINGDOG_API_KEY is missing in backend/.env');
    console.log('Please add SCRAPINGDOG_API_KEY=your_key_here to backend/.env and run this script again: node test-myntra-scrapingdog.js');
    process.exit(1);
  }

  const endpoint = 'https://api.scrapingdog.com/myntra/search';
  const testUrl = 'https://www.myntra.com/nike-shoes?rawQuery=nike%20shoes';

  try {
    const requestUrl = `${endpoint}?api_key=${apiKey}&url=${encodeURIComponent(testUrl)}`;
    console.log(`Requesting ${endpoint} with url=${testUrl}`);
    const response = await fetch(requestUrl);

    console.log('\nHTTP STATUS:', response.status);

    const data = await response.json();
    const searchResults = data.search_results || [];

    console.log(`API RESPONSE: Received ${searchResults.length} products`);

    if (searchResults.length === 0) {
      console.log('API RESPONSE:', JSON.stringify(data).substring(0, 500) + '...');
      console.log('REAL PRODUCTS: FAIL (No products found)');
      return;
    }

    const firstProduct = searchResults[0];
    console.log('\nSample Product (1st result):');
    console.log(JSON.stringify(firstProduct, null, 2));

    const realProductsPass = searchResults.length > 0;
    const productImagesPass = searchResults.some(p => p.searchImage || (p.images && p.images.length > 0));
    const productPricesPass = searchResults.some(p => p.price || p.mrp);
    const productUrlsPass = searchResults.some(p => p.landingPageUrl || p.productUrl);

    console.log('\n--- VERIFICATION REPORT ---');
    console.log('HTTP STATUS:', response.status);
    console.log('API RESPONSE: SUCCESS');
    console.log(`REAL PRODUCTS: ${realProductsPass ? 'PASS' : 'FAIL'} (${searchResults.length} items found)`);
    console.log(`PRODUCT IMAGES: ${productImagesPass ? 'PASS' : 'FAIL'} (searchImage or images array found)`);
    console.log(`PRODUCT PRICES: ${productPricesPass ? 'PASS' : 'FAIL'} (price or mrp found)`);
    console.log(`PRODUCT URLs: ${productUrlsPass ? 'PASS' : 'FAIL'} (landingPageUrl found)`);

  } catch (error) {
    console.log('\nHTTP STATUS:', 'N/A');
    console.log('API RESPONSE: ERROR');
    console.error(error.message);
    console.log('REAL PRODUCTS: FAIL');
    console.log('PRODUCT IMAGES: FAIL');
    console.log('PRODUCT PRICES: FAIL');
    console.log('PRODUCT URLs: FAIL');
  }
}

testMyntraScrapingDog();
