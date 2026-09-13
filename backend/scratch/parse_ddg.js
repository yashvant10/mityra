const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch/ddg.html', 'utf8');
const $ = cheerio.load(html);

$('.result').each((i, el) => {
  const title = $(el).find('.result__title').text().trim();
  const snippet = $(el).find('.result__snippet').text().trim();
  const link = $(el).find('.result__url').attr('href') || $(el).find('.result__url').text().trim();
  console.log(`[${i}] Title:`, title);
  console.log(`    Snippet:`, snippet);
  console.log(`    Link:`, link);
});
