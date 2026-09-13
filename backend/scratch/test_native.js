const { scrapeFlipkartSearch } = require('./dist/services/nativeScraperService.js');

async function test() {
  try {
    const res = await scrapeFlipkartSearch('SHTGXN8GZHFH79HG', 'male');
    console.log(res);
  } catch(e) {
    console.log("Error:", e.message);
  }
}

test();
