const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('https://assets-jiocdn.ajio.com/static/assets/desktop.82ce6b66344481e85f69.82ce6b66344481e85f69.js');
    const code = res.data;
  const endpoints = [
    'https://www.ajio.com/api/rilfnl/searchService/getProductDetails?productCode=469794965',
    'https://www.ajio.com/api/rilfnl/searchService/getProductDetails?productCode=469794965_wine',
    'https://www.ajio.com/api/rilfnl/searchService/getProductDetails?code=469794965',
    'https://www.ajio.com/rilfnlwebservices/v2/rilfnl/products/469794965',
    'https://www.ajio.com/rilfnlwebservices/v2/rilfnl/products/469794965_wine',
    'https://www.ajio.com/api/rilfnlwebservices/v2/rilfnl/products/469794965_wine'
  ];
  for (const ep of endpoints) {
    try {
      const r = await axios.get(ep, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(ep, '=> status:', r.status, 'type:', r.headers['content-type'], 'len:', typeof r.data === 'string' ? r.data.length : JSON.stringify(r.data).length);
      if (r.status === 200) {
        console.log('Sample:', typeof r.data === 'string' ? r.data.slice(0, 300) : JSON.stringify(r.data).slice(0, 300));
      }
    } catch (e) {
      console.log(ep, '=> error', e.message);
    }
  }
  } catch (e) {
    console.error(e);
  }
})();
