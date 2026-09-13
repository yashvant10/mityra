const axios = require('axios');
const fs = require('fs');

async function findInHtml() {
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
  
  // Find index of SHTGXN8GZHFH79HG
  let idx = 0;
  while ((idx = html.indexOf('SHTGXN8GZHFH79HG', idx)) !== -1) {
    console.log(`\nOccurrence at ${idx}:`);
    console.log(html.slice(Math.max(0, idx - 150), Math.min(html.length, idx + 250)));
    idx += 16;
  }
}

findInHtml();
