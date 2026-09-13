const axios = require('axios');
const cheerio = require('cheerio');

async function testFlipkart() {
  console.log('\n--- Testing Flipkart Extraction ---');
  // Sample Flipkart URL:
  const url = 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=SHTGXN8GZHFH79HG';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('Flipkart Status:', res.status);
    const html = res.data;
    const $ = cheerio.load(html);
    const title = $('.B_NuCI').text().trim() || $('.VU-Tmb').text().trim() || $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content');
    const image = $('img._396cs4._2amPTt._3qGmMb').attr('src') || $('img.DByuf4').attr('src') || $('meta[property="og:image"]').attr('content');
    const price = $('div.Nx9bqj.CxhGGd').text().replace(/[^\d.]/g, '') || $('._30jeq3._16Jk6d').text().replace(/[^\d.]/g, '');
    console.log('Flipkart extracted:', { title, image, price });
  } catch (e) {
    console.log('Flipkart error:', e.message, e.response?.status);
  }
}

async function testAjio() {
  console.log('\n--- Testing AJIO Extraction ---');
  const url = 'https://www.ajio.com/the-bear-house-checked-slim-fit-shirt/p/465715975_white';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('AJIO Status:', res.status);
    const html = res.data;
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log('AJIO OG tags:', { ogTitle, ogImage });
  } catch (e) {
    console.log('AJIO error:', e.message, e.response?.status);
  }
}

async function testMeesho() {
  console.log('\n--- Testing Meesho Extraction ---');
  const url = 'https://www.meesho.com/pretty-cotton-women-tops-tunics/p/1z91u0';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 10000
    });
    console.log('Meesho Status:', res.status);
    const html = res.data;
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log('Meesho OG tags:', { ogTitle, ogImage });
  } catch (e) {
    console.log('Meesho error:', e.message, e.response?.status);
  }
}

async function run() {
  await testFlipkart();
  await testAjio();
  await testMeesho();
}

run();
