const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const pid = 'SHTGXN8GZHFH79HG';
  const urls = [
    `https://www.flipkart.com/search?q=${pid}`,
    `https://2.rome.api.flipkart.com/api/4/product/fetch?pid=${pid}`,
    `https://1.rome.api.flipkart.com/api/3/product/summary?pid=${pid}`,
    `https://www.flipkart.com/api/6/product/fetch?pid=${pid}`,
  ];
  for (const u of urls) {
    try {
      const res = await axios.get(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/json,*/*;q=0.8'
        },
        timeout: 8000,
        validateStatus: () => true
      });
      console.log(u, '=> status:', res.status, 'len:', typeof res.data === 'string' ? res.data.length : JSON.stringify(res.data).length);
      if (res.status === 200 && typeof res.data === 'string') {
        const hasPid = res.data.includes(pid);
        const hasTitle = res.data.includes('HIGHLANDER');
        console.log('  hasPid:', hasPid, 'hasTitle:', hasTitle);
        if (hasTitle) {
          const $ = cheerio.load(res.data);
          console.log('  title text:', $('a[title]').first().attr('title') || $('._4rR01T').text() || $('.s1Q9rs').text() || $('.WKTcLC').text());
        }
      }
    } catch(e) {
      console.log(u, '=> error:', e.message);
    }
  }
})();
