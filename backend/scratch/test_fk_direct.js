const axios = require('axios');

(async () => {
  const url = 'https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm535fdb109f6df?pid=SHTGXN8GZHFH79HG';
  const pageUri = '/highlander-men-printed-casual-shirt/p/itm535fdb109f6df?pid=SHTGXN8GZHFH79HG';
  
  // Test 1: Flipkart Rome API
  try {
    const romeRes = await axios.post('https://2.rome.api.flipkart.com/api/4/page/fetch', {
      pageUri
    }, {
      headers: {
        'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://www.flipkart.com',
        'Referer': url
      },
      timeout: 10000,
      validateStatus: () => true
    });
    console.log('Rome API status:', romeRes.status, 'len:', JSON.stringify(romeRes.data).length);
    if (romeRes.status === 200) {
      const fs = require('fs');
      fs.writeFileSync('scratch/fk_rome.json', JSON.stringify(romeRes.data, null, 2));
      console.log('Saved Rome API response to scratch/fk_rome.json');
    }
  } catch(e) {
    console.log('Rome API error:', e.message);
  }

  // Test 2: Mobile direct fetch
  try {
    const mobRes = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
      validateStatus: () => true
    });
    console.log('Mobile direct status:', mobRes.status, 'len:', typeof mobRes.data === 'string' ? mobRes.data.length : 0);
    if (mobRes.status === 200 && typeof mobRes.data === 'string') {
      console.log('Has SHTGXN8GZHFH79HG:', mobRes.data.includes('SHTGXN8GZHFH79HG'));
      console.log('Has ld+json:', mobRes.data.includes('application/ld+json'));
    }
  } catch(e) {
    console.log('Mobile direct error:', e.message);
  }
})();
