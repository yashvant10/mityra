const axios = require('axios');
const cheerio = require('cheerio');

async function testMeesho() {
  const url = 'https://www.meesho.com/classic-men-tshirts/p/1z91u0';
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'curl/8.4.0'
  ];

  for (const ua of uas) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      console.log('UA:', ua.slice(0, 30), 'Status:', res.status, 'Len:', typeof res.data === 'string' ? res.data.length : 0);
      if (res.status === 200 && typeof res.data === 'string') {
        const $ = cheerio.load(res.data);
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogImg = $('meta[property="og:image"]').attr('content');
        console.log('  og:title:', ogTitle);
        console.log('  og:image:', ogImg);
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const j = JSON.parse($(el).html());
            console.log(`  JSON-LD ${i}:`, j['@type'], j.name, j.image);
          } catch(e) {}
        });
        break;
      }
    } catch (e) {
      console.log('UA:', ua.slice(0, 30), 'Error:', e.message);
    }
  }
}

testMeesho();
