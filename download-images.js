const https = require('https');
const fs = require('fs');

const personUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Zendaya_-_2019_by_Glenn_Francis.jpg/400px-Zendaya_-_2019_by_Glenn_Francis.jpg';
const garmentUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Blue_Tshirt.jpg/400px-Blue_Tshirt.jpg';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, function(response) {
      if (response.statusCode === 301 || response.statusCode === 302) {
          return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', function() {
        file.close(() => resolve(dest));
      });
    }).on('error', function(err) {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

Promise.all([
  download(personUrl, 'test_person_dl.jpg'),
  download(garmentUrl, 'test_garment_dl.jpg')
]).then(() => console.log('Downloaded successfully'))
.catch(err => console.error('Download failed', err));
