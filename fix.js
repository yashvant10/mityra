const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');
let countMock = 0;
let countLocalhost = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  if (content.includes('"mock-token-123"')) {
    content = content.replace(/"mock-token-123"/g, '""');
    countMock++;
    changed = true;
  }
  
  if (content.includes('"http://localhost:5000/api"')) {
    content = content.replace(/"http:\/\/localhost:5000\/api"/g, '""');
    countLocalhost++;
    changed = true;
  }
  
  if (content.includes('"http://localhost:5001/api"')) {
    content = content.replace(/"http:\/\/localhost:5001\/api"/g, '""');
    countLocalhost++;
    changed = true;
  }

  if (changed) fs.writeFileSync(f, content);
});

console.log('Fixed mock tokens in ' + countMock + ' files');
console.log('Fixed localhost in ' + countLocalhost + ' files');
