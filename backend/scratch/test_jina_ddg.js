const axios = require('axios');

async function testJinaSearch(query) {
  try {
    const url = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'X-Return-Format': 'markdown' },
      timeout: 15000
    });
    console.log("DDG via Jina for", query, ":\n", res.data.data?.content?.slice(0, 1000));
  } catch(e) {
    console.error("Failed:", e.message);
  }
}

testJinaSearch('ajio 469794965_wine');
testJinaSearch('site:flipkart.com SHTGXN8GZHFH79HG');
