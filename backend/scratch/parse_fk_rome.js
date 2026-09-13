const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/fk_rome.json', 'utf8'));

const images = new Set();
const titles = new Set();
const prices = new Set();

function walk(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (v.includes('rukminim') || v.includes('flixcart') || (v.includes('.jpeg') || v.includes('.jpg'))) {
        images.add(v);
      }
      if (k === 'title' || k === 'productTitle' || k === 'subtitle' || k === 'brand') {
        titles.add(`${k}: ${v}`);
      }
      if (v.startsWith('₹') || (k.toLowerCase().includes('price') && !isNaN(Number(v)))) {
        prices.add(`${k}: ${v}`);
      }
    } else {
      walk(v);
    }
  }
}

walk(data);
console.log('--- TITLES ---');
console.log(Array.from(titles).slice(0, 15));
console.log('--- PRICES ---');
console.log(Array.from(prices).slice(0, 15));
console.log('--- IMAGES ---');
console.log(Array.from(images).slice(0, 10));
