const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const t0 = Date.now();
  const url = 'https://www.meesho.com/s/p/1z91u0';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('Time:', Date.now() - t0, 'ms. Status:', res.status, 'len:', res.data.length);
    const $ = cheerio.load(res.data);
    let title = '', img = '', price = '';
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Product') {
          title = json.name;
          img = Array.isArray(json.image) ? json.image[0] : json.image;
          price = json.offers?.price || json.offers?.[0]?.price;
        }
      } catch(e){}
    });
    console.log('Meesho Title:', title);
    console.log('Meesho Image:', img);
    console.log('Meesho Price:', price);
  } catch(e) {
    console.log('Error:', e.response ? e.response.status : e.message);
  }
})();
