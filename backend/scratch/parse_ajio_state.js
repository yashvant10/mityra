const fs = require('fs');

const html = fs.readFileSync('backend/scratch/ajio_page.html', 'utf8');

const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});\s*<\/script>/s);
if (match) {
  try {
    const state = JSON.parse(match[1]);
    console.log('Top-level keys of __PRELOADED_STATE__:', Object.keys(state));
    for (const key of Object.keys(state)) {
      if (key.toLowerCase().includes('product') || key.toLowerCase().includes('pdp')) {
        console.log(`Key "${key}":`, JSON.stringify(state[key], null, 2).slice(0, 1000));
      }
    }
    // Search anywhere in state for 703847572
    const str = JSON.stringify(state);
    console.log('Includes 703847572:', str.includes('703847572'));
    console.log('Includes neonomad:', str.includes('neonomad') || str.includes('NEONOMAD'));
    
    // Find where 703847572 is
    if (str.includes('703847572')) {
      const idx = str.indexOf('703847572');
      console.log('Context around 703847572:', str.slice(Math.max(0, idx - 200), Math.min(str.length, idx + 800)));
    }
  } catch (e) {
    console.log('JSON parse error:', e.message);
  }
} else {
  console.log('Could not match window.__PRELOADED_STATE__');
}
