const axios = require('axios');

async function testImport(url) {
  console.log(`\n===== Testing: ${url} =====`);
  try {
    const res = await axios.post('http://localhost:5001/api/tryon/import-url', {
      url,
      gender: 'male'
    }, { timeout: 30000 });
    const p = res.data.product;
    console.log(`  Name:  ${p.name}`);
    console.log(`  Price: ₹${p.price}`);
    console.log(`  Image: ${p.imageUrl?.substring(0, 80)}`);
    console.log(`  Brand: ${p.brand}`);
  } catch (err) {
    console.error('  Failed:', err.response ? err.response.data : err.message);
  }
}

(async () => {
  // Test with a live Amazon product
  await testImport('https://www.amazon.in/dp/B0CHX1W1XY');
})();
