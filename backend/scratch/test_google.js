const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
  try {
    const q = 'ajio lp jeans men slim fit polo t-shirt with brand print wine';
    const res = await axios.get('https://www.google.com/search?q=' + encodeURIComponent(q), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    console.log('Google status:', res.status, 'len:', res.data.length);
    const cheerio = require('cheerio');
    const $ = cheerio.load(res.data);
    $('h3').each((i, el) => {
      console.log('H3:', $(el).text());
    });
    $('a').each((i, el) => {
      const h = $(el).attr('href') || '';
      if (h.includes('ajio') || h.includes('polo')) {
        console.log('Link:', h);
      }
    });
    $('img').each((i, el) => {
      console.log('Img:', $(el).attr('src')?.slice(0, 100));
    });
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
