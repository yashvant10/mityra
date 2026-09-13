require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');

async function testGeminiSearch(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: `Find the exact product image URL for: ${query}. Return ONLY the raw image URL. No markdown.` }] }],
    tools: [{ googleSearch: {} }]
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    console.log(json.candidates?.[0]?.content?.parts?.[0]?.text || json);
  } catch(e) {
    console.error(e);
  }
}

testGeminiSearch('Flipkart product SHTGXN8GZHFH79HG');
testGeminiSearch('AJIO product 469794965_wine');
