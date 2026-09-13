const fs = require('fs');
const path = require('path');

const targetStr = 'http://127.0.0.1:5001/api';
const replacementStr = 'http://127.0.0.1:5001/api';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.next' || f === '.git') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('.', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.includes('.env')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(targetStr)) {
      let newContent = content.split(targetStr).join(replacementStr);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
