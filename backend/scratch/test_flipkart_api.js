const axios = require('axios');

async function testFlipkartApi(pid) {
  try {
    const res = await axios.post('https://1.rom.api.flipkart.com/api/4/page/fetch', {
      pageUri: `/p/itm?pid=${pid}`,
      pageContext: {
        pageNumber: 1,
        fetchSeoData: true
      }
    }, {
      headers: {
        'X-user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop'
      }
    });
    
    console.log("Flipkart API Success!");
    const data = res.data;
    const seoMeta = data?.RESPONSE?.seoData?.metaData || [];
    const ogImage = seoMeta.find(m => m.property === 'og:image')?.content;
    const ogTitle = seoMeta.find(m => m.property === 'og:title')?.content;
    
    console.log("Image:", ogImage);
    console.log("Title:", ogTitle);
    
  } catch(e) {
    console.error("Flipkart API failed:", e.message);
  }
}

testFlipkartApi('SHTGXN8GZHFH79HG');
