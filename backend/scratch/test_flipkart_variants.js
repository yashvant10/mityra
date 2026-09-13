const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config({ path: './backend/.env' });
const rapidApiKey = process.env.RAPIDAPI_KEY;

async function testMobileFlipkart() {
  const url = 'https://dl.flipkart.com/dl/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=SHTGXN8GZHFH79HG';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000
    });
    console.log('Mobile Flipkart status:', res.status, 'length:', res.data.length);
    const $ = cheerio.load(res.data);
    console.log('Mobile title:', $('title').text());
    console.log('Mobile og:title:', $('meta[property="og:title"]').attr('content'));
    console.log('Mobile og:image:', $('meta[property="og:image"]').attr('content'));
  } catch (e) {
    console.log('Mobile Flipkart error:', e.message);
  }
}

async function testGoogleShoppingPid() {
  const pid = 'SHTGXN8GZHFH79HG';
  console.log('\n--- Testing Google Shopping for Flipkart PID:', pid);
  try {
    const res = await axios.get(`https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(pid)}&country=in&language=en&page=1`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
      },
      timeout: 10000
    });
    const products = res.data?.data?.products || [];
    console.log('Found products for PID:', products.length);
    if (products.length > 0) {
      console.log('Top match title:', products[0].product_title);
      console.log('Top match url:', products[0].product_page_url || products[0].offer?.offer_page_url);
    }
  } catch (e) {
    console.log('PID search error:', e.message);
  }
}

async function testSlugSearchFlipkart() {
  const slug = 'highlander men printed casual shirt';
  console.log('\n--- Testing Search for Title/Slug:', slug);
  try {
    const res = await axios.get(`https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(slug + ' flipkart')}&country=in&language=en&page=1`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
      },
      timeout: 10000
    });
    const products = res.data?.data?.products || [];
    console.log('Found products for slug:', products.length);
    for (const p of products.slice(0, 3)) {
      console.log('Candidate:', p.product_title, '| Store:', p.offer?.store_name, '| Photo:', p.product_photos?.[0]?.slice(0, 50));
    }
  } catch (e) {
    console.log('Slug search error:', e.message);
  }
}

async function run() {
  await testMobileFlipkart();
  await testGoogleShoppingPid();
  await testSlugSearchFlipkart();
}

run();
