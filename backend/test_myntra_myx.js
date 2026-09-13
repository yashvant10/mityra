const axios = require('axios');
const fs = require('fs');

(async () => {
  const res = await axios.get('https://www.myntra.com/13735100', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = res.data;
  const idx = html.indexOf('window.__myx = ');
  if (idx !== -1) {
    const endIdx = html.indexOf('</script>', idx);
    let raw = html.slice(idx + 'window.__myx = '.length, endIdx).trim();
    if (raw.endsWith(';')) raw = raw.slice(0, -1);
    try {
      const data = JSON.parse(raw);
      console.log('Parsed Myntra ID:', data.pdpData?.id);
      console.log('Parsed Myntra Name:', data.pdpData?.name);
      console.log('Parsed Myntra Brand:', data.pdpData?.brand?.name);
      console.log('Parsed Myntra Price:', data.pdpData?.price?.discounted || data.pdpData?.price?.mrp);
      console.log('Parsed Myntra Image:', data.pdpData?.media?.albums?.[0]?.images?.[0]?.src);
    } catch (e) {
      console.log('Parse error:', e.message, 'near:', raw.slice(15950, 16100));
    }
  }
})();
