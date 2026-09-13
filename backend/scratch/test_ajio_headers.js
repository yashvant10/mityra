const axios = require('axios');

async function testHeaders() {
  const url = 'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige';
  
  const testConfigs = [
    {
      name: 'Googlebot',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    },
    {
      name: 'Mobile Chrome',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      }
    },
    {
      name: 'AJIO API endpoint 1',
      url: 'https://www.ajio.com/api/p/703847572_beige',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    },
    {
      name: 'AJIO API endpoint 2',
      url: 'https://www.ajio.com/api/product/703847572_beige',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    },
    {
      name: 'AJIO API endpoint 3',
      url: 'https://www.ajio.com/api/product/703847572',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    },
    {
      name: 'AJIO API endpoint 4',
      url: 'https://www.ajio.com/api/p/703847572',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    },
    {
      name: 'AJIO with curl impersonate headers',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    }
  ];

  for (const config of testConfigs) {
    const targetUrl = config.url || url;
    try {
      const res = await axios.get(targetUrl, {
        headers: config.headers,
        timeout: 8000,
        validateStatus: () => true
      });
      console.log(`[${config.name}] Status: ${res.status}, Type: ${res.headers['content-type']}, Data len: ${typeof res.data === 'string' ? res.data.length : JSON.stringify(res.data).length}`);
      if (res.status === 200) {
        if (typeof res.data === 'string') {
          console.log(`[${config.name}] Preview:`, res.data.slice(0, 300));
        } else {
          console.log(`[${config.name}] JSON keys:`, Object.keys(res.data));
        }
      }
    } catch (e) {
      console.log(`[${config.name}] Error:`, e.message);
    }
  }
}

testHeaders();
