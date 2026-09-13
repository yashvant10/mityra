const fetch = require('node-fetch');

async function testQuickCommerceSearch() {
  const key = '6a033f1b-dcbe-49ae-aeab-3759fa47f94f'; // from .env
  const query = 'B07R9D1H87'; // ASIN from the Amazon URL
  const platformName = 'Amazon';
  
  const lat = 28.6139;
  const lon = 77.2090;

  const url = `https://api.quickcommerceapi.com/v1/search?q=${encodeURIComponent(query)}&platform=${platformName}&lat=${lat}&lon=${lon}`;
  console.log('Fetching:', url);
  
  const res = await fetch(url, {
    headers: { 'X-API-Key': key }
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response length:', text.length);
  
  try {
    const data = JSON.parse(text);
    console.log('Parsed JSON successfully. Number of products:', data.data?.products?.length || 0);
    if (data.data?.products?.length > 0) {
      const p = data.data.products[0];
      console.log('First product name:', p.name);
      console.log('First product price:', p.offer_price || p.mrp);
      console.log('First product image:', p.images?.[0]);
    }
  } catch (e) {
    console.log('Failed to parse response as JSON');
    console.log(text.substring(0, 500));
  }
}

testQuickCommerceSearch();
