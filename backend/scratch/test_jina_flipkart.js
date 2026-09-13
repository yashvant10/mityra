const axios = require('axios');

async function testJinaReader(url) {
  try {
    const res = await axios.get(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'application/json', 'X-Return-Format': 'markdown' },
      timeout: 15000
    });
    console.log("Jina Reader Result for", url, ":", res.data.data?.content?.slice(0, 1500) || res.data);
  } catch(e) {
    console.error("Jina Reader failed:", e.message);
  }
}

testJinaReader('https://www.flipkart.com/highlander-men-printed-casual-shirt/p/itm535fdb109f6df?pid=SHTGXN8GZHFH79HG');
