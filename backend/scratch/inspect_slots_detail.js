const axios = require('axios');

async function inspectSlotData() {
  const pid = 'SHTGXN8GZHFH79HG';
  const url = 'https://1.rome.api.flipkart.com/api/4/page/fetch';
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
  const slots = res.data?.RESPONSE?.slots || [];
  console.log('Slot 2:', JSON.stringify(slots[2]?.widget?.data, null, 2).slice(0, 1500));
  console.log('Slot 4:', JSON.stringify(slots[4]?.widget?.data, null, 2).slice(0, 1500));
  console.log('Slot 6:', JSON.stringify(slots[6]?.widget?.data, null, 2).slice(0, 1500));
}

inspectSlotData();
