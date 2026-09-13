const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

(async () => {
  const pid = 'SHTGXN8GZHFH79HG';
  const u = `https://www.flipkart.com/search?q=${pid}`;
  const res = await axios.get(u, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  fs.writeFileSync('scratch/fk_search_res.html', res.data);
  const html = res.data;
  let idx = 0;
  while ((idx = html.indexOf(pid, idx)) !== -1) {
    console.log('Search match at', idx, ':', html.slice(Math.max(0, idx - 100), idx + 250));
    idx += pid.length;
  }
})();
