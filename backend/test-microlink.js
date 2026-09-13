const fetch = require('node-fetch');

async function testMicrolink() {
  const url = 'https://www.amazon.in/Van-Heusen-Athleisure-Regular-T-Shirt/dp/B07R9D1H87';
  console.log(`Testing Microlink for: ${url}`);
  try {
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    console.log('Microlink status:', data.status);
    if (data.status === 'success') {
      console.log('Title:', data.data.title);
      console.log('Image:', data.data.image?.url);
      console.log('Price:', data.data.price);
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
}
testMicrolink();
