const axios = require('axios');

async function extractAjio(url) {
  console.log('--- Testing AJIO Extraction ---');
  console.log('Input URL:', url);

  const cleanUrl = url.split('?')[0];
  const urlObj = new URL(cleanUrl);
  const path = urlObj.pathname;

  // Extract ID and variant
  // e.g. /neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige
  const codeMatch = path.match(/\/p\/([0-9a-zA-Z]+)(?:_([0-9a-zA-Z]+))?/);
  let productId = null;
  let variant = null;
  if (codeMatch) {
    productId = codeMatch[1];
    variant = codeMatch[2] || null;
  }

  console.log('Extracted Product ID:', productId);
  console.log('Extracted Variant:', variant);

  // 1. Try Jina Reader
  const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
  console.log('Fetching via Jina Reader:', jinaUrl);

  const res = await axios.get(jinaUrl, {
    headers: {
      'Accept': 'application/json',
      'X-Return-Format': 'markdown'
    },
    timeout: 15000
  });

  if (res.status === 200 && res.data) {
    const payload = res.data?.data || res.data;
    const content = payload.content || '';
    const metadata = payload.metadata || {};
    const pageTitle = payload.title || '';

    console.log('Jina returned status 200');
    console.log('Page Title:', pageTitle);
    console.log('Metadata og:image:', metadata['og:image']);
    console.log('Metadata og:description:', metadata['og:description']);
    console.log('Metadata canonical:', payload.canonical);

    // Verify product ID matches
    const canonical = Object.keys(payload.canonical || {})[0] || metadata['og:url'] || '';
    const contentMatchesId = content.includes(productId) || canonical.includes(productId) || (metadata['og:image'] && metadata['og:image'].includes(productId));
    console.log('Content matches product ID:', contentMatchesId);

    if (!contentMatchesId) {
      throw new Error('Unable to verify this AJIO product');
    }

    // Extract Brand
    let brand = '';
    const brandMatch = content.match(/##\s*([A-Z0-9\s&'-]+)\s*\n/i);
    if (brandMatch) {
      brand = brandMatch[1].trim();
    }
    if (!brand) {
      const slugBrand = path.split('/')[1]?.split('-')[0];
      brand = slugBrand ? slugBrand.toUpperCase() : 'AJIO';
    }

    // Extract Title
    let title = '';
    // Method 1: from clean pageTitle
    if (pageTitle) {
      title = pageTitle
        .replace(/^Buy\s+/i, '')
        .replace(/\s+Online.*$/i, '')
        .replace(/\s*\|\s*AJIO.*$/i, '')
        .trim();
    }
    // Method 2: from # heading in markdown
    if (!title) {
      const h1Match = content.match(/^#\s+([A-Za-z0-9\s\-_,.'()]+)$/m);
      if (h1Match) {
        const rawH1 = h1Match[1].trim();
        title = brand && !rawH1.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${rawH1}` : rawH1;
      }
    }

    // Extract Price
    let price = '';
    const priceMatch = content.match(/₹([\d,]+)/);
    if (priceMatch) {
      price = priceMatch[1].replace(/,/g, '');
    }

    // Extract Image URL
    let imageUrl = '';
    // Look for high-res images in content
    const imgMatches = content.match(/https?:\/\/[^\s\)"']+\/medias\/sys_master\/[^\s\)"']+/g) || [];
    console.log('Found image matches in content:', imgMatches.length);
    
    // Prefer the main MODEL image for this product and variant
    const modelImg = imgMatches.find(img => 
      img.includes(productId) && 
      (!variant || img.toLowerCase().includes(variant.toLowerCase())) && 
      img.includes('-MODEL.')
    ) || imgMatches.find(img => 
      img.includes(productId) && 
      (!variant || img.toLowerCase().includes(variant.toLowerCase()))
    );

    if (modelImg) {
      imageUrl = modelImg.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
    } else if (imgMatches.length > 0) {
      imageUrl = imgMatches[0].replace(/-\d+Wx\d+H-/, '-473Wx593H-');
    } else if (metadata['og:image']) {
      imageUrl = metadata['og:image'].replace(/-\d+Wx\d+H-/, '-473Wx593H-');
    }

    // Fallback images from markdown
    if (!imageUrl) {
      const allImages = content.match(/https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp|avif)/gi) || [];
      const productImages = allImages.filter(img => img.includes(productId) || (variant && img.includes(variant)));
      if (productImages.length > 0) {
        imageUrl = productImages[0];
      }
    }

    console.log('\n--- FINAL EXTRACTED OBJECT ---');
    console.log({
      productId,
      variant,
      brand,
      title,
      price,
      imageUrl,
      url: cleanUrl
    });

    return {
      title,
      price,
      imageUrl,
      platform: 'ajio',
      url: cleanUrl,
      brand
    };
  }
}

const TEST_URL = 'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige?user=old&itm_source=banner&itm_source_detail=Minimum%2Bforty%2Bpercent%2Boff%2Bathletic%2Bshoes.%2BBlack%2Band%2Bgold%2Bsneakers%2Bfeatured.%2BShop%2BAdidas%252C%2BAsics%252C%2Band%2Bmore.';

extractAjio(TEST_URL);
