const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const t0 = Date.now();
  const url = 'https://www.amazon.in/dp/B0HBQGP7FJ';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('Time:', Date.now() - t0, 'ms. Status:', res.status, 'len:', res.data.length);
    const $ = cheerio.load(res.data);
    const title = $('#productTitle').text().trim();
    const dynamicImg = $('#landingImage').attr('data-a-dynamic-image');
    let img = '';
    if (dynamicImg) {
      try { img = Object.keys(JSON.parse(dynamicImg))[0]; } catch(e){}
    }
    if (!img) img = $('#landingImage').attr('src') || '';
    const price = $('.a-price-whole').first().text().replace(/[^\d.]/g, '');
    console.log('Title:', title);
    console.log('Image:', img);
    console.log('Price:', price);
  } catch(e) {
    console.log('Time:', Date.now() - t0, 'ms. Error:', e.response ? e.response.status : e.message);
  }
})();
