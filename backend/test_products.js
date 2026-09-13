const fetch = require('node-fetch');

const platforms = ['flipkart', 'amazon', 'myntra', 'ajio', 'meesho'];
const API = 'http://localhost:5001/api/tryon/products';

async function testPlatforms() {
  console.log('Testing product fetch APIs...\n');
  
  for (const platform of platforms) {
    console.log(`[${platform.toUpperCase()}] fetching...`);
    try {
      const start = Date.now();
      const res = await fetch(`${API}?store=${platform}&gender=male&category=T-Shirts&limit=2`);
      const time = Date.now() - start;
      
      if (!res.ok) {
        const text = await res.text();
        console.log(`  FAIL - HTTP ${res.status} (${time}ms): ${text.substring(0, 100)}`);
        continue;
      }
      
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        console.log(`  PASS - Found ${data.products.length} products (${time}ms)`);
        console.log(`         First: ${data.products[0].title.substring(0, 50)}`);
      } else {
        console.log(`  FAIL - HTTP 200 but 0 products found (${time}ms)`);
      }
    } catch (e) {
      console.log(`  FAIL - Error: ${e.message}`);
    }
  }
}

testPlatforms();
