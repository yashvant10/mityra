const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function inspectAjioProduct() {
  const url = 'https://www.ajio.com/api/product/703847572_beige';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });

  console.log('Status:', res.status);
  fs.writeFileSync('backend/scratch/ajio_page.html', res.data);
  console.log('Saved HTML to backend/scratch/ajio_page.html');

  const $ = cheerio.load(res.data);
  console.log('\n--- METADATA ---');
  console.log('Title:', $('title').text().trim());
  console.log('og:title:', $('meta[property="og:title"]').attr('content'));
  console.log('og:image:', $('meta[property="og:image"]').attr('content'));
  console.log('og:description:', $('meta[property="og:description"]').attr('content'));
  console.log('og:url:', $('meta[property="og:url"]').attr('content'));
  console.log('product:price:amount:', $('meta[property="product:price:amount"]').attr('content'));
  console.log('product:brand:', $('meta[property="product:brand"]').attr('content'));
  console.log('twitter:image:', $('meta[name="twitter:image"]').attr('content'));
  console.log('twitter:title:', $('meta[name="twitter:title"]').attr('content'));

  console.log('\n--- JSON-LD ---');
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const json = JSON.parse($(el).html());
      console.log(`JSON-LD [${i}]:`, JSON.stringify(json, null, 2).slice(0, 500));
    } catch (e) {
      console.log(`JSON-LD [${i}] parse error:`, $(el).html()?.slice(0, 200));
    }
  });

  console.log('\n--- SCRIPTS with product data ---');
  $('script').each((i, el) => {
    const text = $(el).html() || '';
    if (text.includes('703847572') || text.includes('neonomad') || text.includes('productDetails') || text.includes('window.__PRELOADED_STATE__')) {
      console.log(`Script [${i}]: length ${text.length}, sample: ${text.slice(0, 300)}`);
    }
  });
}

inspectAjioProduct();
