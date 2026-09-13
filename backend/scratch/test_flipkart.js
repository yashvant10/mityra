const axios = require('axios');
const cheerio = require('cheerio');

async function testFlipkartBots() {
  const url = 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm28e833fb3d001?pid=SHTGXN8GZHFH79HG';
  const uas = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    'WhatsApp/2.21.12.21 A',
    'TelegramBot (like TwitterBot)',
    'Googlebot/2.1 (+http://www.google.com/bot.html)'
  ];

  for (const ua of uas) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
        validateStatus: () => true
      });
      console.log('UA:', ua.slice(0, 30), 'Status:', res.status, 'Len:', typeof res.data === 'string' ? res.data.length : 0);
      if (res.status === 200 && typeof res.data === 'string') {
        const $ = cheerio.load(res.data);
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogImg = $('meta[property="og:image"]').attr('content');
        const title = $('title').text();
        console.log('  og:title:', ogTitle);
        console.log('  og:image:', ogImg);
        console.log('  title:', title);
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const j = JSON.parse($(el).html());
            console.log(`  JSON-LD ${i}:`, j['@type'], j.name, j.image);
          } catch(e) {}
        });
      }
    } catch (e) {
      console.log('UA:', ua.slice(0, 30), 'Error:', e.message);
    }
  }
}

testFlipkartBots();
