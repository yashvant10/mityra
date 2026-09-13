const axios = require('axios');

async function findPrices() {
  const r = await axios.get('https://www.amazon.in/dp/B0CHX1W1XY', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' },
    timeout: 15000
  });
  const html = r.data;
  
  // Search for price patterns in the raw HTML
  const patterns = [
    /\"priceAmount\"\s*:\s*\"?(\d+\.?\d*)/g,
    /\"price\"\s*:\s*\"?(\d{2,6}\.?\d{0,2})/g,
    /\"value\"\s*:\s*\"?(\d{4,6}\.?\d{0,2})/g,
    /₹\s*(\d[\d,]*\.?\d*)/g,
    /\"buyingPrice\"\s*:\s*(\d+)/g,
    /data-a-color="price"[^>]*>.*?(\d[\d,]+)/gs,
  ];
  
  for (const pat of patterns) {
    const matches = [...html.matchAll(pat)];
    if (matches.length > 0) {
      console.log(`Pattern ${pat.source}:`);
      matches.slice(0, 5).forEach(m => console.log(`  ${m[1]}`));
    }
  }
}

findPrices().catch(e => console.error(e.message));
