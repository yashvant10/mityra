const fs = require('fs');

const scriptContent = fs.readFileSync('./backend/scratch/flipkart_script.txt', 'utf8');

// Match JSON string inside JSON.parse("...")
const match = scriptContent.match(/window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("(.*?)"\);/s);
if (match) {
  try {
    const rawJson = JSON.parse(`"${match[1]}"`);
    const data = JSON.parse(rawJson);
    console.log('Loader data keys:', Object.keys(data.loaderData || {}));
    
    // Search for product details inside data
    const str = JSON.stringify(data);
    console.log('Total JSON length:', str.length);
    
    // Find title, price, images
    for (const key of Object.keys(data.loaderData)) {
      const val = data.loaderData[key];
      if (val && typeof val === 'object') {
        // Let's inspect pageData or product info
        console.log(`Key ${key} properties:`, Object.keys(val));
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
} else {
  console.log('Script regex did not match');
}
