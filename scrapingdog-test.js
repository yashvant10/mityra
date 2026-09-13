require('dotenv').config({path: './backend/.env'}); 
const apiKey = process.env.SCRAPINGDOG_API_KEY; 
if (!apiKey) throw new Error('No key'); 
const url = encodeURIComponent('https://www.flipkart.com/the-indian-garage-co-men-striped-casual-shirt/p/itmd043bb22f1837');
fetch('https://api.scrapingdog.com/scrape?api_key=' + apiKey + '&url=' + url + '&dynamic=false')
.then(async r => { 
  console.log('Status:', r.status); 
  const html = await r.text(); 
  const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  console.log('Title:', titleMatch ? titleMatch[1] : 'null'); 
})
.catch(console.error);
