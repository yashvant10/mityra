const d = require('./fk_resp.json');
const fs = require('fs');

// Recursive search for text/images/prices in JSON
function findStrings(obj, keyFilter, results = []) {
  if (!obj) return results;
  if (typeof obj === 'string') return results;
  if (Array.isArray(obj)) {
    obj.forEach(item => findStrings(item, keyFilter, results));
    return results;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (keyFilter(k, v)) {
      results.push({ key: k, value: v });
    }
    if (typeof v === 'object') {
      findStrings(v, keyFilter, results);
    }
  }
  return results;
}

// Find images
const images = findStrings(d, (k, v) => typeof v === 'string' && v.includes('rukminim'));
console.log('Images found:', images.length);
images.slice(0, 10).forEach(img => console.log('IMG:', img.key, img.value));

// Find titles / labels
const labels = findStrings(d, (k, v) => k === 'text' || k === 'title' || k === 'superTitle');
console.log('Labels found:', labels.length);
labels.slice(0, 20).forEach(l => console.log('LABEL:', l.key, l.value));
