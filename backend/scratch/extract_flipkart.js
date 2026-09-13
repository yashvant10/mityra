const axios = require('axios');

async function extractFlipkartFull() {
  const url = 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=SHTGXN8GZHFH79HG';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
    timeout: 10000
  });
  const html = res.data;
  
  // Find images hosted on ruko or flipkart cdn (rukminim)
  const imgMatches = html.match(/https:\/\/(?:rukminim\d*\.flixcart\.com|static-assets-web\.flixcart\.com)\/image\/[^"'\s\\]+/g) || [];
  console.log('Rukminim image matches:', imgMatches.slice(0, 5));

  // Find image in JSON (e.g. "url":"https://rukminim...")
  const jsonImgMatches = html.match(/"url":"(https:\/\/[^"]*?rukminim[^"]*?)"/g) || [];
  console.log('JSON image matches count:', jsonImgMatches.length);
  if (jsonImgMatches.length > 0) {
    console.log('First JSON img match:', jsonImgMatches[0]);
  }

  // Find title in JSON (e.g. "title":"..." or "name":"...")
  const titleMatches = html.match(/"(productTitle|title|superTitle)":"([^"]+)"/g) || [];
  console.log('Title matches:', titleMatches.slice(0, 5));

  // Find price in JSON (e.g. "specialPrice":..., "finalPrice":..., "price":...)
  const priceMatches = html.match(/"(finalPrice|specialPrice|sellingPrice|price)":\s*"?(\d+)"?/g) || [];
  console.log('Price matches:', priceMatches.slice(0, 5));
}

extractFlipkartFull();
