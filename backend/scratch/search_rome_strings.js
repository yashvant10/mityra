const axios = require('axios');

async function searchAllStrings() {
  const pid = 'SHTGXN8GZHFH79HG';
  const url = 'https://1.rome.api.flipkart.com/api/4/page/fetch';
  const res = await axios.post(url, {
    pageUri: `/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=${pid}`,
    locationContext: { pincode: '560001' }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Origin': 'https://www.flipkart.com',
      'Referer': `https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=${pid}`,
    },
    timeout: 8000
  });

  const fullJson = JSON.stringify(res.data);
  // Look for any url or http
  const allUrls = fullJson.match(/https?:\/\/[^"'\\]+/g) || [];
  console.log('Total URLs found in Rome JSON:', allUrls.length);
  const sampleUrls = allUrls.filter(u => u.includes('rukminim') || u.includes('image') || u.includes('.jpeg') || u.includes('.jpg') || u.includes('.png'));
  console.log('Sample image URLs:', sampleUrls.slice(0, 10));

  // Look for titles or names
  const titles = fullJson.match(/"text":"([^"]+)"/g) || [];
  console.log('Sample text nodes:', titles.slice(0, 15));
}

searchAllStrings();
