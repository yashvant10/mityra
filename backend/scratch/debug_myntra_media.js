const axios = require('axios');

async function debugMyntra() {
  const url = 'https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/2164324/buy';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 10000
  });

  const html = res.data;
  const match = html.match(/<script>window\.__myx\s*=\s*({.*?})<\/script>/s);
  if (match) {
    const data = JSON.parse(match[1]);
    const pdp = data.pdpData;
    console.log('pdp.id:', pdp?.id);
    console.log('pdp.name:', pdp?.name);
    console.log('pdp.brand:', JSON.stringify(pdp?.brand));
    console.log('pdp.price:', JSON.stringify(pdp?.price));
    console.log('pdp.media keys:', Object.keys(pdp?.media || {}));
    console.log('pdp.media.albums keys:', Object.keys(pdp?.media?.albums || {}));
    
    const albums = pdp?.media?.albums;
    if (albums) {
      for (const [key, album] of Object.entries(albums)) {
        console.log(`  Album "${key}":`, JSON.stringify(album, null, 2)?.slice(0, 500));
      }
    }
    
    // Also check pdp.media.images
    console.log('pdp.media.images:', JSON.stringify(pdp?.media?.images?.slice(0, 2)));
    
    // Broad search for image-like URLs in pdpData
    const pdpStr = JSON.stringify(pdp);
    const imgMatches = pdpStr.match(/https?:\/\/[^"]+\.(jpg|jpeg|png|webp)/gi) || [];
    console.log('\nAll image URLs in pdpData:', imgMatches.slice(0, 5));
    
    // Check for "imageURL" or "src" keys
    const srcMatches = pdpStr.match(/"(?:imageURL|src|image|secureSrc)"\s*:\s*"([^"]+)"/gi) || [];
    console.log('\nAll image key-value pairs:', srcMatches.slice(0, 5));
  } else {
    console.log('No __myx match found');
  }
}

debugMyntra();
