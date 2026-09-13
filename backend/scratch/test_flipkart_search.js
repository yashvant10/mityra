const axios = require('axios');
const cheerio = require('cheerio');

async function testFlipkartSearch(pid) {
  try {
    const res = await axios.get(`https://www.flipkart.com/search?q=${pid}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    
    const $ = cheerio.load(res.data);
    const title = $('a[target="_blank"]').first().text();
    const img = $('img').first().attr('src');
    
    console.log("Flipkart Search:", res.status);
    console.log("Title:", title);
    console.log("Img:", img);
    console.log("HTML slice:", res.data.substring(0, 500));
  } catch(e) {
    console.error("Flipkart Search failed:", e.message);
  }
}

testFlipkartSearch('SHTGXN8GZHFH79HG');
