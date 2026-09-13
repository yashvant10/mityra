const http = require('http');

async function fetchProducts(store, gender, q) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({ store, gender, q }).toString();
    http.get(`http://localhost:5001/api/tryon/products?${query}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log("1. Men T-shirt (Amazon)");
  let r1 = await fetchProducts('amazon', 'male', 'men t shirt');
  console.log(`Status: ${r1.status}`);
  console.log(`Products: ${r1.body?.products?.length || 0}`);
  if (r1.body?.products?.[0]) console.log(JSON.stringify(r1.body.products[0], null, 2));

  console.log("\n2. Men Shirt (Flipkart)");
  let r2 = await fetchProducts('flipkart', 'male', 'men shirt');
  console.log(`Status: ${r2.status}`);
  console.log(`Products: ${r2.body?.products?.length || 0}`);

  console.log("\n3. Women Dress (Myntra)");
  let r3 = await fetchProducts('myntra', 'female', 'women dress');
  console.log(`Status: ${r3.status}`);
  console.log(`Products: ${r3.body?.products?.length || 0}`);

  console.log("\n4. Indian Wear (AJIO)");
  let r4 = await fetchProducts('ajio', 'female', 'kurti');
  console.log(`Status: ${r4.status}`);
  console.log(`Products: ${r4.body?.products?.length || 0}`);
}

run();
