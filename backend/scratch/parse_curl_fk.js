const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch/curl_fk.html', 'utf8');
const $ = cheerio.load(html);

$('script[type="application/ld+json"]').each((i, el) => {
  console.log('--- LD JSON', i, '---');
  console.log($(el).html());
});

// Search where SHTGXN8GZHFH79HG appears in the HTML
let idx = 0;
while ((idx = html.indexOf('SHTGXN8GZHFH79HG', idx)) !== -1) {
  console.log('Match at', idx, ':', html.slice(Math.max(0, idx - 100), idx + 200));
  idx += 16;
}
