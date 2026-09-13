const axios = require('axios');
const fs = require('fs');

async function inspectRome() {
  const pid = 'SHTGXN8GZHFH79HG';
  const url = 'https://1.rome.api.flipkart.com/api/4/page/fetch';
  try {
    const res = await axios.post(url, {
      pageUri: `/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=${pid}`,
      locationContext: { pincode: '560001' }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://www.flipkart.com',
        'Referer': `https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm19b02a91fa9a5?pid=${pid}`,
      },
      timeout: 8000
    });
    const data = res.data;
    const slots = data?.RESPONSE?.slots || [];
    console.log('Total slots:', slots.length);
    
    // Find title, price, images across widgets
    for (const slot of slots) {
      const widget = slot?.widget;
      const type = widget?.type;
      const dataKey = widget?.dataKey;
      const title = widget?.data?.title || widget?.data?.productTitle || widget?.data?.name;
      if (title) {
        console.log(`Slot type: ${type}, dataKey: ${dataKey}, Title:`, title);
      }
      // Check multimedia widget
      if (type === 'MULTIMEDIA' || slot?.slotType === 'MULTIMEDIA' || dataKey?.includes('MULTIMEDIA')) {
        console.log('MULTIMEDIA widget:', JSON.stringify(widget?.data)?.slice(0, 300));
      }
      // Check pricing widget
      if (dataKey?.includes('PRICING') || type?.includes('PRICE')) {
        console.log('PRICING widget:', JSON.stringify(widget?.data)?.slice(0, 300));
      }
      // Check title widget
      if (dataKey?.includes('TITLE') || type?.includes('TITLE')) {
        console.log('TITLE widget:', JSON.stringify(widget?.data)?.slice(0, 300));
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

inspectRome();
