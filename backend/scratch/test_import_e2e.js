const axios = require('axios');

const API = 'http://localhost:5001/api';

async function testImport(label, url) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`URL:  ${url}`);
  console.log('═'.repeat(60));
  
  try {
    const res = await axios.post(`${API}/tryon/import-url`, {
      url: url,
      gender: 'male'
    }, { timeout: 30000 });
    
    const p = res.data.product;
    console.log('✓ SUCCESS');
    console.log(`  Title: ${p.title}`);
    console.log(`  Brand: ${p.brand}`);
    console.log(`  Price: ${p.price}`);
    console.log(`  Image: ${p.imageUrl?.slice(0, 100)}`);
    console.log(`  Store: ${p.store}`);
  } catch (e) {
    if (e.response) {
      console.log('✗ ERROR:', e.response.status, e.response.data?.error || e.response.data);
    } else {
      console.log('✗ ERROR:', e.message);
    }
  }
}

async function run() {
  // Test 1: Myntra (should use pdpData — verified ID match)
  await testImport(
    'Myntra — Roadster T-shirt (ID 2164324)',
    'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/2164324/buy'
  );
  
  // Test 2: Amazon (ASIN lookup)
  await testImport(
    'Amazon — DEEMOON Shirt (ASIN B0HBQGP7FJ)',
    'https://www.amazon.in/DEEMOON-Premium-Checkered-Comfortable-Everyday/dp/B0HBQGP7FJ'
  );
  
  // Test 3: Flipkart (slug-based search with validation)
  await testImport(
    'Flipkart — Highlander Casual Shirt',
    'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=SHTGXN8GZHFH79HG'
  );
}

run();
