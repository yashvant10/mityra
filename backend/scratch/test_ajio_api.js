const axios = require('axios');
const fs = require('fs');

(async () => {
  try {
    const res = await axios.get('https://www.ajio.com/api/product/469794965_wine', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 10000
    });
    const html = res.data;
    console.log('Status:', res.status, 'HTML Length:', html.length);
    fs.writeFileSync('scratch/ajio_page.html', html);
    const m = html.indexOf('<title>');
    console.log('Title slice:', html.slice(m, m + 100));
    console.log('Has 469794965:', html.includes('469794965'));
    console.log('Has LP JEANS:', html.toLowerCase().includes('lp jeans') || html.toLowerCase().includes('lp-jeans'));
    return;
    
    // Check title tag
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) console.log('Title:', titleMatch[1].trim());

    // Check og:image
    const ogImg = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImg) console.log('og:image:', ogImg[1]);

    // Check og:title
    const ogTitle = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitle) console.log('og:title:', ogTitle[1]);

    fs.writeFileSync('scratch/ajio_api_sample.html', html.slice(0, 50000));
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
