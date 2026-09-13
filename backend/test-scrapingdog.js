const axios = require('axios');
const cheerio = require('cheerio');

async function testScrapingDog() {
  const url = 'https://www.amazon.in/Van-Heusen-Athleisure-Regular-T-Shirt/dp/B07R9D1H87';
  const apiKey = '6a8943d02b7946a9dc57e6d8';
  
  console.log(`Using ScrapingDog for: ${url}`);
  try {
    const scrapeUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(url)}&dynamic=false`;
    const response = await axios.get(scrapeUrl, { timeout: 20000 });
    
    const html = response.data;
    console.log(`Received HTML length: ${html.length}`);
    
    if (html.includes('api.scrapingdog.com')) {
       console.log('Error from scrapingdog API directly in html?');
    }
    
    // Check if the API key is exhausted
    if (html.length < 500) {
      console.log('HTML snippet:', html);
    }
    
    const $ = cheerio.load(html);
    const title = $('#productTitle').text().trim() || $('title').text().trim();
    console.log('Parsed Title:', title);
    
    const price = $('.a-price-whole').first().text().replace(/[^\d.]/g, '');
    console.log('Parsed Price:', price);
    
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

testScrapingDog();
