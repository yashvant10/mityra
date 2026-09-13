async function testBackend() {
  const cases = [
    { name: '1. Men + Shirts + College (Myntra)', url: 'http://localhost:5001/api/tryon/products?store=myntra&gender=male&category=shirts&occasion=college' },
    { name: '2. Men + Shirts + Office (Myntra)', url: 'http://localhost:5001/api/tryon/products?store=myntra&gender=male&category=shirts&occasion=office' },
    { name: '3. Men + Kurta/Ethnic + Festival (Myntra)', url: 'http://localhost:5001/api/tryon/products?store=myntra&gender=male&category=kurta&occasion=festival' },
    { name: '4. Women + Dresses + Party (Myntra)', url: 'http://localhost:5001/api/tryon/products?store=myntra&gender=female&category=dresses&occasion=party' },
    { name: '5. Women + Kurta/Ethnic + Festival (Myntra)', url: 'http://localhost:5001/api/tryon/products?store=myntra&gender=female&category=kurta&occasion=festival' },
    { name: '6. Regression: Amazon', url: 'http://localhost:5001/api/tryon/products?store=amazon&gender=male&category=shirts' },
    { name: '7. Regression: Flipkart', url: 'http://localhost:5001/api/tryon/products?store=flipkart&gender=female&category=dresses' },
  ];

  for (const c of cases) {
    console.log(`\nTesting: ${c.name}`);
    try {
      const res = await fetch(c.url);
      const data = await res.json();
      const products = data.products || [];
      console.log(`PASS: Returned ${products.length} products.`);
      if (products.length > 0) {
        const sample = products[0];
        console.log(`Sample: [${sample.store}] ${sample.title} (${sample.price})`);
        if (c.name.includes('Myntra') && sample.store !== 'myntra') {
          console.error(`FAIL: Store mismatch! Expected myntra, got ${sample.store}`);
        }
      } else {
        console.log('FAIL: No products found');
      }
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
    }
  }
}

testBackend();
