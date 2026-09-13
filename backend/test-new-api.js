const https = require('https');

function testAPI(urlParam) {
  const options = {
    hostname: 'realtime-flipkart-amazon-myntra-ajio-croma-product-details.p.rapidapi.com',
    path: `/product?url=${encodeURIComponent(urlParam)}`,
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'realtime-flipkart-amazon-myntra-ajio-croma-product-details.p.rapidapi.com',
      'x-rapidapi-key': '6efae02042mshbdfac89670a5cabp103146jsne0c24241ea81'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2).substring(0, 1000) + '...');
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.setTimeout(10000, () => {
    console.log('Timeout');
    req.destroy();
  });

  req.on('error', (e) => {
    console.error(e);
  });
  req.end();
}

// Test with an actual Amazon product URL
testAPI('https://www.amazon.in/dp/B0CHX1W1XY');
