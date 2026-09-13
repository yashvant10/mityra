const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/PROJECT_COMPLETE_BACKUP/backend/.env' });

const AJIO_URL = 'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige?user=old&itm_source=banner&itm_source_detail=Minimum%2Bforty%2Bpercent%2Boff%2Bathletic%2Bshoes.%2BBlack%2Band%2Bgold%2Bsneakers%2Bfeatured.%2BShop%2BAdidas%252C%2BAsics%252C%2Band%2Bmore.';

async function test() {
  console.log('Testing AJIO URL:', AJIO_URL);
  
  // 1. Clean URL
  const cleanUrl = AJIO_URL.split('?')[0];
  console.log('Clean URL:', cleanUrl);
  
  // 2. Extract code
  const codeMatch = cleanUrl.match(/\/p\/([0-9a-zA-Z_]+)/);
  console.log('Code match:', codeMatch ? codeMatch[1] : 'none');
  
  // Try native fetch
  try {
    const res = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });
    console.log('Native fetch status:', res.status, 'HTML length:', typeof res.data === 'string' ? res.data.length : 'not string');
    if (typeof res.data === 'string') {
      const $ = cheerio.load(res.data);
      console.log('Title tag:', $('title').text());
      console.log('og:title:', $('meta[property="og:title"]').attr('content'));
      console.log('og:image:', $('meta[property="og:image"]').attr('content'));
      console.log('og:price:amount:', $('meta[property="product:price:amount"]').attr('content'));
      console.log('prod-name:', $('.prod-name').text());
      console.log('prod-sp:', $('.prod-sp').text());
      console.log('brand-name:', $('.brand-name').text());
      
      // Look for JSON-LD or script tags with product data
      $('script[type="application/ld+json"]').each((i, el) => {
        console.log(`JSON-LD [${i}]:`, $(el).html()?.slice(0, 300));
      });
      
      $('script').each((i, el) => {
        const text = $(el).html() || '';
        if (text.includes('703847572') || text.includes('neonomad') || text.includes('window.__PRELOADED_STATE__')) {
          console.log(`Script with match [${i}]: length ${text.length}, preview: ${text.slice(0, 200)}`);
        }
      });
    }
  } catch (err) {
    console.log('Native fetch failed:', err.message, err.response?.status);
  }

  // Also test ScrapingDog if available
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  console.log('\nScrapingDog API key present:', !!apiKey);
  if (apiKey) {
    try {
      const scrapeUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(cleanUrl)}&dynamic=false`;
      console.log('Trying ScrapingDog...');
      const sdRes = await axios.get(scrapeUrl, { timeout: 20000 });
      console.log('ScrapingDog status:', sdRes.status, 'data length:', typeof sdRes.data === 'string' ? sdRes.data.length : 'not string');
      if (typeof sdRes.data === 'string') {
        const $ = cheerio.load(sdRes.data);
        console.log('SD Title:', $('title').text());
        console.log('SD og:title:', $('meta[property="og:title"]').attr('content'));
        console.log('SD og:image:', $('meta[property="og:image"]').attr('content'));
        console.log('SD og:price:amount:', $('meta[property="product:price:amount"]').attr('content'));
        
        $('script[type="application/ld+json"]').each((i, el) => {
          console.log(`SD JSON-LD [${i}]:`, $(el).html()?.slice(0, 300));
        });
        
        $('script').each((i, el) => {
          const text = $(el).html() || '';
          if (text.includes('703847572') || text.includes('neonomad') || text.includes('window.__PRELOADED_STATE__')) {
            console.log(`SD Script match [${i}]: length ${text.length}, preview: ${text.slice(0, 200)}`);
          }
        });
      }
    } catch (sdErr) {
      console.log('ScrapingDog error:', sdErr.message);
    }
  }
}

test();
