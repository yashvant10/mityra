const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/PROJECT_COMPLETE_BACKUP/backend/.env' });

async function testSD() {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  console.log('API Key:', apiKey ? apiKey.slice(0, 5) + '...' : 'none');
  const target = 'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige';
  
  // Test basic scrape
  try {
    const url = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(target)}`;
    const res = await axios.get(url, { validateStatus: () => true });
    console.log('SD response status:', res.status);
    console.log('SD response data:', res.data);
  } catch (e) {
    console.log('SD error:', e.message);
  }
}

testSD();
