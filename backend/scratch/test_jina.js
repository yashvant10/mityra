const axios = require('axios');

async function testJinaSearch(query) {
  try {
    const res = await axios.get(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'application/json' },
      timeout: 15000
    });
    console.log("Jina Search Result:", res.data.data?.[0]?.content?.slice(0, 500) || res.data);
  } catch(e) {
    console.error("Jina Search failed:", e.message);
  }
}

testJinaSearch('ajio 469794965 wine');
testJinaSearch('flipkart SHTGXN8GZHFH79HG');
