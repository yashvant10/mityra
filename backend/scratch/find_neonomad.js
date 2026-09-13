const fs = require('fs');

const html = fs.readFileSync('backend/scratch/ajio_page.html', 'utf8');
const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});\s*<\/script>/s);
if (match) {
  const state = JSON.parse(match[1]);
  const str = JSON.stringify(state);
  let idx = 0;
  while ((idx = str.toLowerCase().indexOf('neonomad', idx)) !== -1) {
    console.log(`Found "neonomad" at ${idx}:`);
    console.log(str.slice(Math.max(0, idx - 150), Math.min(str.length, idx + 350)));
    console.log('---');
    idx += 8;
  }
}
