const axios = require('axios');
const cheerio = require('cheerio');

async function testFetch(url, ua) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html' },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const title = $('title').text();
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log(`[${ua.substring(0,20)}] ${url.substring(12,25)}: ${res.status} | Title: ${title.substring(0,40)} | Img: ${ogImage}`);
  } catch(e) {
    console.error(`[${ua.substring(0,20)}] ${url.substring(12,25)}: Failed - ${e.message}`);
  }
}

const ajioUrl = 'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine';
const flipkartUrl = 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm535fdb109f6df?pid=SHTGXN8GZHFH79HG';

const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const facebookbot = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const whatsappbot = 'WhatsApp/2.21.12.21 A';

testFetch(ajioUrl, googlebot);
testFetch(ajioUrl, facebookbot);
testFetch(ajioUrl, whatsappbot);
testFetch(flipkartUrl, googlebot);
testFetch(flipkartUrl, facebookbot);
testFetch(flipkartUrl, whatsappbot);
