const axios = require('axios');

async function checkMyntraPdp() {
  const url = 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/2164324/buy';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000
  });

  const html = res.data;
  // Match window.__myx = { ... }
  const match = html.match(/<script>window\.__myx\s*=\s*({.*?})<\/script>/s);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const pdp = data.pdpData;
      console.log('Myntra PDP id:', pdp?.id);
      console.log('Myntra PDP name:', pdp?.name);
      console.log('Myntra PDP brand:', pdp?.brand?.name);
      console.log('Myntra PDP price:', pdp?.price?.discounted || pdp?.price?.mrp);
      console.log('Myntra PDP media:', pdp?.media?.albums?.[0]?.images?.[0]?.src);
    } catch (e) {
      console.error('JSON parse error:', e.message);
    }
  }
}

checkMyntraPdp();
