const axios = require('axios');

async function testRomeApi() {
  const pid = 'SHTGXN8GZHFH79HG';
  const url = 'https://1.rome.api.flipkart.com/api/4/page/fetch';
  try {
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
    console.log('Rome API status:', res.status);
    const data = res.data;
    const str = JSON.stringify(data);
    console.log('Rome response length:', str.length);
    // Find images and titles
    const imgs = str.match(/https:\/\/[^"]*?rukminim[^"]*?/g) || [];
    console.log('Rome images:', imgs.slice(0, 3));
    const titleMatch = str.match(/"title":"([^"]+)"/);
    console.log('Rome title:', titleMatch?.[1]);
  } catch (e) {
    console.log('Rome API error:', e.message, e.response?.status);
  }
}

testRomeApi();
