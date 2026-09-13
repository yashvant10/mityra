const https = require('https');

const API_HOST = 'realtime-flipkart-amazon-myntra-ajio-croma-product-details.p.rapidapi.com';
const API_KEY = '6efae02042mshbdfac89670a5cabp103146jsne0c24241ea81';

const testUrls = {
  Amazon: 'https://www.amazon.in/dp/B0CHX1W1XY',
  Flipkart: 'https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4',
  Myntra: 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/1996777/buy',
  AJIO: 'https://www.ajio.com/dnmx-men-slim-fit-crew-neck-t-shirt/p/441121111_black',
  Croma: 'https://www.croma.com/apple-iphone-15-128gb-black-/p/300652'
};

function makeRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: API_HOST,
      path: path,
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 500, error: e.message });
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ status: 408, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('--- TESTING SEARCH ENDPOINT ---');
  const searchRes = await makeRequest('/search?q=shirt');
  console.log(`GET /search?q=shirt -> Status: ${searchRes.status}`);
  if (searchRes.status === 200) {
    console.log(searchRes.data.substring(0, 200));
  } else {
    console.log('Search endpoint probably does not exist.');
  }

  console.log('\n--- TESTING GET PRODUCT ENDPOINT ---');
  for (const [store, url] of Object.entries(testUrls)) {
    console.log(`\nTesting ${store}...`);
    const path = `/product?url=${encodeURIComponent(url)}`;
    const res = await makeRequest(path);
    console.log(`Status: ${res.status}`);
    
    if (res.status === 200) {
      try {
        const json = JSON.parse(res.data);
        const data = json.data || json; // adjust based on actual response structure
        console.log(`Name: ${data.name || data.title ? '✅' : '❌'}`);
        console.log(`Image: ${data.image || data.imageUrl || data.images ? '✅' : '❌'}`);
        console.log(`Price: ${data.price || data.current_price || data.selling_price ? '✅' : '❌'}`);
        console.log(`Brand: ${data.brand ? '✅' : '❌'}`);
        console.log(`URL: ${data.url || data.productUrl || data.link ? '✅' : '❌'}`);
        console.log(`Store/Platform: ${data.store || data.platform || data.source ? '✅' : '❌'}`);
        console.log(`Availability: ${data.availability || data.in_stock !== undefined || data.out_of_stock !== undefined ? '✅' : '❌'}`);
        
        console.log('Keys available in response:', Object.keys(data).join(', '));
      } catch (e) {
        console.log('Failed to parse JSON', res.data.substring(0, 100));
      }
    } else {
      console.log('Response:', res.data.substring(0, 200));
    }
  }
}

runTests();
