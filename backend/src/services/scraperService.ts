import axios from 'axios';
import * as cheerio from 'cheerio';
import config from '../config';

export interface ScrapedProduct {
  title: string;
  price: string;
  imageUrl: string;
  platform: string;
  url: string;
  brand?: string;
  productId?: string;
  variant?: string;
}

// Track if ScrapingDog quota has been exhausted to avoid repeated wasted calls
let scrapingDogQuotaExhausted = false;

function getRapidApiKey(): string {
  return config.rapidapi?.key || (process.env.RAPIDAPI_KEY || process.env.REACT_APP_RAPIDAPI_KEY || '').trim();
}

// ─── PRODUCT IDENTIFIER EXTRACTION ─────────────────────────────────────────

interface ProductIdentifier {
  platform: string;
  id: string | null;       // Platform-specific ID (ASIN, styleId, PID, etc.)
  variant?: string | null; // Product variant/color (e.g. beige)
  slug: string;            // URL slug for keyword extraction
  brandFromSlug: string;   // First meaningful slug token (often the brand)
}

/**
 * Extract the platform-specific product identifier and slug keywords from the URL.
 */
function extractProductIdentifier(url: string): ProductIdentifier {
  let platform = 'unknown';
  if (url.includes('amazon.in') || url.includes('amzn.in') || url.includes('amazon.com')) platform = 'amazon';
  else if (url.includes('flipkart.com')) platform = 'flipkart';
  else if (url.includes('myntra.com')) platform = 'myntra';
  else if (url.includes('ajio.com')) platform = 'ajio';
  else if (url.includes('meesho.com')) platform = 'meesho';

  let id: string | null = null;
  let variant: string | null = null;
  let slug = '';
  let brandFromSlug = '';

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    if (platform === 'amazon') {
      // ASIN: /dp/B0HBQGP7FJ or /gp/product/B0HBQGP7FJ
      const asinMatch = path.match(/\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i);
      if (asinMatch) id = asinMatch[1].toUpperCase();
      // Slug is the part before /dp/
      const slugPart = path.split(/\/dp\//i)[0];
      slug = slugPart.replace(/^\//, '').replace(/[_-]/g, ' ').trim();
    } else if (platform === 'flipkart') {
      // PID from query: ?pid=SHTGXN8GZHFH79HG
      const pidParam = urlObj.searchParams.get('pid');
      if (pidParam) id = pidParam;
      // Fallback: item ID from path /p/itm...
      if (!id) {
        const itmMatch = path.match(/\/p\/(itm[a-zA-Z0-9]+)/);
        if (itmMatch) id = itmMatch[1];
      }
      // Slug: first path segment (e.g. "highlander-men-printed-casual-shirt")
      const parts = path.split('/').filter(p => p.length > 0 && p !== 'p' && p !== 'dl' && !p.startsWith('itm'));
      if (parts.length > 0) slug = parts[0].replace(/[_-]/g, ' ').trim();
    } else if (platform === 'myntra') {
      // Style ID: last numeric segment in path (e.g. /tshirts/roadster/.../2164324/buy)
      const idMatch = path.match(/\/(\d{5,12})/);
      if (idMatch) id = idMatch[1];
      // Slug: path segments that are descriptive
      const parts = path.split('/').filter(p => p.length > 2 && !/^\d+$/.test(p) && p !== 'buy');
      slug = parts.join(' ').replace(/[_-]/g, ' ').trim();
    } else if (platform === 'ajio') {
      // Product code: /p/703847572_beige
      // URL.pathname cleanly isolates path without query params like ?user=old&itm_source=...
      const codeMatch = path.match(/\/p\/([0-9a-zA-Z]+)(?:_([0-9a-zA-Z]+))?/);
      if (codeMatch) {
        id = codeMatch[1]; // Exact product ID: 703847572
        variant = codeMatch[2] ? codeMatch[2].toLowerCase() : null; // Variant: beige
      }
      // Slug: descriptive path before /p/
      const slugPart = path.split('/p/')[0];
      slug = slugPart.replace(/^\//, '').replace(/[_-]/g, ' ').trim();
    } else if (platform === 'meesho') {
      // Product code: /p/1z91u0
      const codeMatch = path.match(/\/p\/([a-zA-Z0-9]+)/);
      if (codeMatch) id = codeMatch[1];
      // Slug: path before /p/
      const slugPart = path.split('/p/')[0];
      slug = slugPart.replace(/^\//, '').replace(/[_-]/g, ' ').trim();
    } else {
      // Generic
      const parts = path.split('/').filter(p => p.length > 2);
      slug = parts.join(' ').replace(/[_-]/g, ' ').trim();
    }
  } catch (e) { /* ignore */ }

  // Extract likely brand from slug (first token)
  const slugTokens = slug.split(/\s+/).filter(t => t.length > 1);
  brandFromSlug = slugTokens[0] || '';

  return { platform, id, variant, slug, brandFromSlug };
}

/**
 * Extract clean product keywords from URL slug for searching
 */
function extractSlugKeywords(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0 && p !== 'dp' && p !== 'p' && p !== 'buy' && p !== 'd' && p !== 'dl');
    if (pathParts.length > 0) {
      // Find the most descriptive part
      let slug = pathParts[0];
      if (slug.length < 5 && pathParts.length > 1) slug = pathParts[1];
      slug = slug.replace(/(-[a-zA-Z0-9]{10,})/g, ''); // remove IDs like ASIN or alphanumeric IDs
      slug = slug.replace(/[_-]/g, ' ');
      slug = slug.replace(/\b(dp|p|buy|itm[a-z0-9]+)\b/gi, '');
      return slug.trim();
    }
  } catch (e) { /* ignore */ }
  return '';
}

// ─── STRICT CANDIDATE VALIDATION ────────────────────────────────────────────

/**
 * Validate that a search candidate matches the requested product by brand + keywords.
 * Returns a confidence score 0-1.
 */
function validateCandidate(
  candidateTitle: string,
  requestedSlug: string,
  requestedBrand: string,
  platform: string
): number {
  if (!candidateTitle || !requestedSlug) return 0;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const candidateNorm = normalize(candidateTitle);
  const slugNorm = normalize(requestedSlug);
  const brandNorm = normalize(requestedBrand);

  // Tokenize
  const candidateTokens = new Set(candidateNorm.split(/\s+/).filter(t => t.length > 1));
  const slugTokens = slugNorm.split(/\s+/).filter(t => t.length > 1);

  if (slugTokens.length === 0) return 0;

  // Brand match check
  let brandMatch = false;
  if (brandNorm && brandNorm.length > 1) {
    brandMatch = candidateNorm.includes(brandNorm);
  }

  // Keyword overlap
  let matchCount = 0;
  for (const token of slugTokens) {
    if (candidateTokens.has(token)) matchCount++;
  }
  const overlapRatio = matchCount / slugTokens.length;

  // Score: brand match is heavily weighted
  let score = overlapRatio * 0.6;
  if (brandMatch) score += 0.4;

  return score;
}

/**
 * Fallback to RapidAPI real-time-product-search (Google Shopping index)
 * WITH strict identity validation against the requested product.
 */
async function fallbackSearchProduct(
  keywords: string,
  platform: string,
  requestedSlug: string,
  requestedBrand: string,
  requestedVariant?: string | null,
  requestedId?: string | null
): Promise<{ title?: string; imageUrl?: string; price?: string; verified: boolean }> {
  const apiKey = getRapidApiKey();
  if (!apiKey || !keywords) return { verified: false };

  try {
    const query = `${keywords} ${platform}`.trim();
    const searchUrl = `https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(query)}&country=in&language=en&page=1`;
    console.log(`[SCRAPER-FALLBACK] Querying Google Shopping via RapidAPI: "${query}"`);
    
    const res = await axios.get(searchUrl, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
      },
      timeout: 15000
    });

    const products = res.data?.data?.products || [];
    if (products.length === 0) return { verified: false };

    // Find the best-matching candidate instead of blindly taking products[0]
    let bestScore = 0;
    let bestCandidate: any = null;

    for (const product of products.slice(0, 10)) {
      const title = product.product_title || '';
      const candidateUrl = product.product_page_url || product.offer?.offer_page_url || '';
      
      // Strict identity check for AJIO
      if (platform === 'ajio') {
        const hasIdMatch = requestedId && (title.includes(requestedId) || candidateUrl.includes(requestedId));
        const normTitle = title.toLowerCase();
        const hasVariantMatch = requestedVariant && normTitle.includes(requestedVariant.toLowerCase());
        
        // If variant is requested (e.g. beige), reject candidates that don't match or have conflicting colors
        if (requestedVariant && !hasVariantMatch && !hasIdMatch) {
          console.log(`[SCRAPER-FALLBACK] AJIO candidate rejected (missing variant "${requestedVariant}"): "${title.slice(0, 60)}"`);
          continue;
        }
      }

      const score = validateCandidate(title, requestedSlug, requestedBrand, platform);
      console.log(`[SCRAPER-FALLBACK] Candidate: "${title.slice(0, 60)}" score: ${score.toFixed(2)}`);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = product;
      }
    }

    // Require minimum 0.8 confidence AND exact ID match if platform demands it
    const requiresExactId = platform === 'flipkart' || platform === 'meesho' || platform === 'ajio';
    
    if (requiresExactId && bestCandidate) {
        const cTitle = (bestCandidate.product_title || '').toLowerCase();
        const cUrl = (bestCandidate.product_page_url || bestCandidate.offer?.offer_page_url || '').toLowerCase();
        const idLower = (requestedId || '').toLowerCase();
        
        if (idLower && !cTitle.includes(idLower) && !cUrl.includes(idLower)) {
             console.log(`[SCRAPER-FALLBACK] Rejecting candidate due to missing exact ID: ${idLower}`);
             return { verified: false };
        }
    }

    if (bestCandidate && bestScore >= 0.8) {
      const photo = bestCandidate.product_photos?.[0] || '';
      const title = bestCandidate.product_title || '';
      const price = bestCandidate.offer?.price ? String(bestCandidate.offer.price).replace(/[^\d.]/g, '') : '';
      console.log(`[SCRAPER-FALLBACK] ✓ Verified match (score=${bestScore.toFixed(2)}): "${title}"`);
      return { title, imageUrl: photo, price, verified: true };
    }

    console.log(`[SCRAPER-FALLBACK] ✗ No verified match found. Best score: ${bestScore.toFixed(2)}. Rejecting to prevent wrong product.`);
    return { verified: false };
  } catch (err: any) {
    console.warn(`[SCRAPER-FALLBACK] Product search fallback failed: ${err.message}`);
  }
  return { verified: false };
}

/**
 * Fallback to RapidAPI Amazon product details by ASIN
 */
async function fallbackAmazonDetails(asin: string): Promise<{ title?: string; imageUrl?: string; price?: string; asin?: string }> {
  const apiKey = getRapidApiKey();
  if (!apiKey || !asin) return {};

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${encodeURIComponent(asin)}&country=IN`;
    console.log(`[SCRAPER-AMAZON] Fetching Amazon ASIN details: ${asin}`);
    
    const res = await axios.get(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
      },
      timeout: 12000
    });

    const data = res.data?.data;
    if (data) {
      let photo = data.product_photo || (data.product_photos && data.product_photos[0]) || '';
      const title = data.product_title || '';
      const price = data.product_price ? String(data.product_price).replace(/[^\d.]/g, '') : '';
      const returnedAsin = data.asin || asin;

      // Verify the returned ASIN matches the requested ASIN
      if (returnedAsin.toUpperCase() !== asin.toUpperCase()) {
        console.warn(`[SCRAPER-AMAZON] ASIN mismatch! Requested: ${asin}, Got: ${returnedAsin}. Rejecting.`);
        return {};
      }

      console.log(`[SCRAPER-AMAZON] ✓ Verified Amazon ASIN=${asin}: "${title}"`);
      return { title, imageUrl: photo, price, asin: returnedAsin };
    }
  } catch (err: any) {
    console.warn(`[SCRAPER-AMAZON] Amazon ASIN lookup failed: ${err.message}`);
  }
  return {};
}

// ─── MYNTRA DIRECT PDP EXTRACTION ───────────────────────────────────────────

/**
 * Extract product data directly from Myntra's server-rendered pdpData.
 * Myntra embeds window.__myx = { pdpData: { ... } } in the HTML.
 */
function extractMyntraPdpData(html: string, requestedId: string | null): {
  title?: string; price?: string; imageUrl?: string; brand?: string; verified: boolean;
} {
  try {
    const match = html.match(/<script>window\.__myx\s*=\s*({.*?})<\/script>/s);
    if (!match) return { verified: false };

    const data = JSON.parse(match[1]);
    const pdp = data.pdpData;
    if (!pdp) return { verified: false };

    // Verify the product ID matches the requested one
    if (requestedId && String(pdp.id) !== String(requestedId)) {
      console.warn(`[SCRAPER-MYNTRA] ID mismatch! Requested: ${requestedId}, Got: ${pdp.id}. Rejecting.`);
      return { verified: false };
    }

    const brand = pdp.brand?.name || pdp.analytics?.brand || '';
    const name = pdp.name || '';
    const title = brand ? `${brand} ${name}`.trim() : name;
    const price = String(pdp.price?.discounted || pdp.price?.mrp || pdp.mrp || '');

    // Extract image URL from media albums
    // Structure: albums = { "0": { name: "default", images: [{ src, secureSrc, imageURL }] }, ... }
    let imageUrl = '';
    const albums = pdp.media?.albums;
    if (albums) {
      // Find the "default" album (or first album with images)
      let targetAlbum: any = null;
      for (const key of Object.keys(albums)) {
        const album = albums[key];
        if (album?.images?.length > 0) {
          targetAlbum = album;
          if (album.name === 'default') break; // prefer "default" album
        }
      }

      if (targetAlbum?.images?.length > 0) {
        const img = targetAlbum.images[0];
        // Prefer imageURL (clean, no templates) or secureSrc (HTTPS with templates)
        const rawUrl = img.imageURL || img.secureSrc || img.src || '';
        if (rawUrl) {
          imageUrl = rawUrl
            .replace(/h_\(\$height\)/g, 'h_900')
            .replace(/w_\(\$width\)/g, 'w_720')
            .replace(/q_\(\$qualityPercentage\)/g, 'q_80')
            .replace(/\(\$width\)/g, '720')
            .replace(/\(\$height\)/g, '900')
            .replace(/\(\$qualityPercentage\)/g, '80');
          if (!imageUrl.startsWith('http')) {
            imageUrl = 'https:' + (imageUrl.startsWith('//') ? '' : '//') + imageUrl;
          }
          // Upgrade to HTTPS
          if (imageUrl.startsWith('http://')) {
            imageUrl = imageUrl.replace('http://', 'https://');
          }
        }
      }
    }

    console.log(`[SCRAPER-MYNTRA] ✓ Verified Myntra ID=${pdp.id}: "${title}", image: ${imageUrl?.slice(0, 80)}...`);
    return { title, price, imageUrl, brand, verified: true };
  } catch (e: any) {
    console.warn(`[SCRAPER-MYNTRA] pdpData parse error: ${e.message}`);
    return { verified: false };
  }
}

// ─── AJIO URL SLUG PARSER ───────────────────────────────────────────────────

/**
 * Parse AJIO URL slug to extract brand name and product title.
 * AJIO slugs follow: /brand-descriptive-product-name/p/ID_variant
 * e.g. /lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine
 */
function parseAjioSlug(slug: string): { brand: string; productName: string } {
  if (!slug) return { brand: '', productName: '' };

  // Split slug tokens (already space-separated by extractProductIdentifier)
  const tokens = slug.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return { brand: '', productName: '' };

  // AJIO brand is typically the first 1-3 slug tokens in UPPERCASE
  // Known multi-word AJIO brands
  const knownBrands: Record<string, string> = {
    'lp jeans': 'LP JEANS',
    'lp': 'LP',
    'louis philippe': 'LOUIS PHILIPPE',
    'van heusen': 'VAN HEUSEN',
    'allen solly': 'ALLEN SOLLY',
    'peter england': 'PETER ENGLAND',
    'u s polo': 'U.S. POLO ASSN.',
    'us polo': 'U.S. POLO ASSN.',
    'united colors of benetton': 'UNITED COLORS OF BENETTON',
    'jack jones': 'JACK & JONES',
    'jack and jones': 'JACK & JONES',
    'tommy hilfiger': 'TOMMY HILFIGER',
    'calvin klein': 'CALVIN KLEIN',
    'monte carlo': 'MONTE CARLO',
    't base': 'T-BASE',
    'flying machine': 'FLYING MACHINE',
  };

  const slugLower = slug.toLowerCase();
  let brand = '';
  let nameStartIdx = 0;

  // Try matching known multi-word brands first
  for (const [key, val] of Object.entries(knownBrands)) {
    if (slugLower.startsWith(key)) {
      brand = val;
      nameStartIdx = key.split(/\s+/).length;
      break;
    }
  }

  // Fallback: use the first token as brand
  if (!brand && tokens.length > 0) {
    brand = tokens[0].toUpperCase();
    nameStartIdx = 1;
  }

  // Remaining tokens form the product name
  const nameTokens = tokens.slice(nameStartIdx);
  const minorWords = new Set(['with', 'of', 'and', 'in', 'for', 'on', 'at', 'to', 'by', 'the', 'a', 'an']);
  const words: string[] = [];

  for (let i = 0; i < nameTokens.length; i++) {
    const current = nameTokens[i].toLowerCase();
    const next = (nameTokens[i + 1] || '').toLowerCase();

    // Handle 't' followed by 'shirt' -> 'T-Shirt'
    if (current === 't' && (next === 'shirt' || next === 'shirts')) {
      words.push(next === 'shirts' ? 'T-Shirts' : 'T-Shirt');
      i++;
      continue;
    }
    // Handle 'v' followed by 'neck' -> 'V-Neck'
    if (current === 'v' && next === 'neck') {
      words.push('V-Neck');
      i++;
      continue;
    }
    // Handle 'u' followed by 'neck' -> 'U-Neck'
    if (current === 'u' && next === 'neck') {
      words.push('U-Neck');
      i++;
      continue;
    }
    if (i > 0 && minorWords.has(current)) {
      words.push(current);
    } else {
      words.push(current.charAt(0).toUpperCase() + current.slice(1));
    }
  }

  const productName = words.join(' ');
  return { brand, productName };
}

// ─── AJIO STRUCTURED DATA EXTRACTORS ────────────────────────────────────────

/**
 * Extract product data from AJIO's ld+json ProductGroup/Product script tags.
 * This is the most reliable structured data source when the page loads.
 */
function extractAjioLdJson(html: string, requestedId: string | null, requestedVariant: string | null): {
  title?: string; price?: string; imageUrl?: string; brand?: string; verified: boolean;
} {
  try {
    const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
    for (const m of ldMatches) {
      try {
        const jsonStr = m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const json = JSON.parse(jsonStr);
        if (json['@type'] === 'ProductGroup' || json['@type'] === 'Product') {
          // Verify product ID matches
          const groupId = json.productGroupID || json.sku || json.productID || '';
          if (requestedId && !String(groupId).includes(requestedId)) {
            console.log(`[AJIO-LDJSON] ID mismatch: expected ${requestedId}, got ${groupId}. Skipping.`);
            continue;
          }

          const brand = json.brand?.name || '';
          const name = json.name || '';
          const title = brand && !name.toLowerCase().includes(brand.toLowerCase())
            ? `${brand} ${name}` : (name || '');

          let imageUrl = '';
          if (typeof json.image === 'string') {
            imageUrl = json.image;
          } else if (Array.isArray(json.image) && json.image.length > 0) {
            imageUrl = json.image[0];
          }
          // Upgrade to high resolution
          if (imageUrl) {
            imageUrl = imageUrl.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
          }

          const price = json.offers?.price || '';

          console.log(`[AJIO-LDJSON] ✓ Extracted from ld+json: "${title}", brand: "${brand}", price: ${price}`);
          return { title, price: String(price), imageUrl, brand, verified: true };
        }
      } catch (e) { /* skip malformed ld+json */ }
    }
  } catch (e) { /* ignore */ }
  return { verified: false };
}

/**
 * Extract product data from AJIO's __PRELOADED_STATE__ Redux store.
 * This contains the full product state including images, sizes, colors.
 */
function extractAjioPreloadedState(html: string, requestedId: string | null, requestedVariant: string | null): {
  title?: string; price?: string; imageUrl?: string; brand?: string; verified: boolean;
} {
  try {
    const preloadMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (!preloadMatch) return { verified: false };

    const state = JSON.parse(preloadMatch[1]);
    const product = state.product;
    if (!product) return { verified: false };

    // Navigate common AJIO state shapes
    // product might be the product data directly, or product.data, or product.productDetails
    const pd = product.data || product.productDetails || product;

    // Try to find the product code/ID in the state
    const stateId = pd.code || pd.productCode || pd.baseProduct || '';
    if (requestedId && stateId && !String(stateId).includes(requestedId)) {
      console.log(`[AJIO-STATE] ID mismatch: expected ${requestedId}, got ${stateId}. Skipping.`);
      return { verified: false };
    }

    const brand = pd.brandName || pd.brand?.name || pd.fnlColorVariantData?.brandName || '';
    const name = pd.name || pd.productName || pd.fnlColorVariantData?.productName || '';
    const title = brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}` : (name || '');

    // Price extraction
    const price = String(pd.wasPriceData?.value || pd.warehousePrice?.value || pd.price?.value || pd.mrp || '');

    // Image extraction
    let imageUrl = '';
    const images = pd.images || pd.fnlColorVariantData?.images || [];
    if (Array.isArray(images) && images.length > 0) {
      // Prefer MODEL image
      const modelImg = images.find((img: any) => {
        const u = img.url || img.imageUrl || img.src || '';
        return u.includes('-MODEL.');
      });
      const firstImg = modelImg || images[0];
      imageUrl = firstImg?.url || firstImg?.imageUrl || firstImg?.src || '';
    }
    if (imageUrl) {
      imageUrl = imageUrl.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
      if (!imageUrl.startsWith('http')) {
        imageUrl = 'https://assets.ajio.com/medias/sys_master/' + imageUrl;
      }
    }

    if (title) {
      console.log(`[AJIO-STATE] ✓ Extracted from __PRELOADED_STATE__: "${title}", brand: "${brand}"`);
      return { title, price, imageUrl, brand, verified: true };
    }
  } catch (e: any) {
    console.warn(`[AJIO-STATE] __PRELOADED_STATE__ parse error: ${e.message}`);
  }
  return { verified: false };
}

/**
 * Extract product data from AJIO's og meta tags and page title.
 */
function extractAjioOgTags(html: string, requestedId: string | null): {
  title?: string; price?: string; imageUrl?: string; verified: boolean;
} {
  try {
    // og:image — contains product image URL
    const ogImgMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/);
    let imageUrl = ogImgMatch ? ogImgMatch[1] : '';
    if (imageUrl && requestedId && !imageUrl.includes(requestedId)) {
      // Image doesn't belong to this product
      imageUrl = '';
    }
    if (imageUrl) {
      imageUrl = imageUrl.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
    }

    // og:title
    const ogTitleMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/);
    let title = ogTitleMatch ? ogTitleMatch[1] : '';
    if (title) {
      title = title
        .replace(/^Buy\s+/i, '')
        .replace(/\s+Online.*$/i, '')
        .replace(/\s*\|\s*AJIO.*$/i, '')
        .replace(/\s*\|\s*ajio\.com.*$/i, '')
        .trim();
    }

    // Fallback: <title> tag
    if (!title) {
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].trim()
          .replace(/^Buy\s+/i, '')
          .replace(/\s+Online.*$/i, '')
          .replace(/\s*\|\s*AJIO.*$/i, '')
          .replace(/\s*\|\s*ajio\.com.*$/i, '')
          .trim();
      }
    }

    // Price from product:price:amount
    const priceMatch = html.match(/property="product:price:amount"[^>]*content="([^"]+)"/);
    const price = priceMatch ? priceMatch[1] : '';

    if (title || imageUrl) {
      console.log(`[AJIO-OG] ✓ Extracted from og tags: "${title}", image: ${imageUrl ? 'yes' : 'no'}`);
      return { title, price, imageUrl, verified: true };
    }
  } catch (e) { /* ignore */ }
  return { verified: false };
}

interface AjioSearchResult {
  imageUrl: string;
  price?: string;
  title?: string;
}

/**
 * Search for the AJIO product image and details via RapidAPI Google Shopping.
 * STRICT: Only accepts results whose URL contains the exact product ID or matches the exact title & garment.
 * This is ONLY used to discover the image, NOT to substitute the product.
 */
async function searchAjioProductData(
  keywords: string,
  productId: string,
  variant: string | null,
): Promise<AjioSearchResult | null> {
  const apiKey = getRapidApiKey();
  if (!apiKey || !keywords) return null;

  // Try multiple search strategies — include the product ID + variant code for precise matching
  const queries = [
    `ajio ${productId}_${variant || ''} ${keywords}`.trim(),
    `${keywords} ${variant || ''} ajio.com`.trim(),
  ];

  for (const query of queries) {
    try {
      const searchUrl = `https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(query)}&country=in&language=en&page=1`;
      console.log(`[AJIO-IMGSEARCH] Searching for exact product image: "${query}"`);

      const res = await axios.get(searchUrl, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
        },
        timeout: 15000
      });

      const products = res.data?.data?.products || [];
      for (const product of products.slice(0, 10)) {
        const candidateUrl = product.product_page_url || product.offer?.offer_page_url || '';
        const candidateTitle = (product.product_title || '').toLowerCase();

        // STRICT: candidate URL or title must contain the exact AJIO product ID
        const hasIdInUrl = candidateUrl.includes(productId);
        const hasIdInTitle = candidateTitle.includes(productId);

        // Also verify by keyword match: title should mention the brand or key product terms
        const keywordsLower = keywords.toLowerCase();
        const keyTokens = keywordsLower.split(/\s+/).filter((t: string) => t.length > 2 && t !== 'with' && t !== 'men');
        const matchCount = keyTokens.filter((t: string) => candidateTitle.includes(t)).length;
        const hasGoodTitleMatch = matchCount >= Math.min(3, keyTokens.length);

        // Garment type check to prevent cross-category mismatch (e.g. polo vs jeans)
        const garmentTypes = ['polo', 't-shirt', 'shirt', 'jeans', 'dress', 'jacket', 'kurta', 'trouser', 'sneakers'];
        const expectedGarments = garmentTypes.filter(g => keywordsLower.includes(g));
        const matchesGarment = expectedGarments.length === 0 || expectedGarments.some(g => {
          if (g === 't-shirt') return candidateTitle.includes('t-shirt') || candidateTitle.includes('tshirt') || candidateTitle.includes('tee') || candidateTitle.includes('shirt');
          return candidateTitle.includes(g);
        });

        if ((hasIdInUrl || hasIdInTitle) && hasGoodTitleMatch && matchesGarment) {
          const photo = product.product_photos?.[0] || '';
          if (photo) {
            console.log(`[AJIO-IMGSEARCH] ✓ Found verified image for ID ${productId}: "${product.product_title?.slice(0, 60)}"`);
            console.log(`[AJIO-IMGSEARCH]   Image: ${photo.slice(0, 100)}`);
            const price = product.price ? String(product.price).trim() : undefined;
            return {
              imageUrl: photo,
              price,
              title: product.product_title || undefined
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`[AJIO-IMGSEARCH] Search failed for query "${query}": ${err.message}`);
    }
  }

  console.log(`[AJIO-IMGSEARCH] ✗ No verified result for ID ${productId}. Rejecting all candidates.`);
  return null;
}

// ─── MAIN AJIO EXTRACTOR ────────────────────────────────────────────────────

/**
 * Dedicated AJIO Product Extractor — Multi-layered approach.
 *
 * Layer 1: Parse URL slug for brand + product name (always available)
 * Layer 2: Direct page fetch with browser-like headers (bypasses Akamai ~20-50%)
 * Layer 3: Extract structured data from ld+json / __PRELOADED_STATE__ / og tags
 * Layer 4: Jina Reader (legacy fallback)
 * Layer 5: URL-based product construction with strict image search
 *
 * NEVER returns a different product. If exact verification fails, throws.
 */
async function extractAjioProduct(
  url: string,
  productId: string | null,
  variant: string | null,
  slug: string,
  brandFromSlug: string
): Promise<ScrapedProduct> {
  const cleanUrl = url.split('?')[0];
  console.log(`[AJIO-EXTRACT] Starting extraction for AJIO product ID: ${productId}, variant: ${variant}`);
  console.log(`[AJIO-EXTRACT] Clean URL: ${cleanUrl}`);

  // ─── Layer 1: URL Slug Parsing (always succeeds) ──────────────────
  const slugData = parseAjioSlug(slug);
  const slugBrand = slugData.brand || (brandFromSlug ? brandFromSlug.toUpperCase() : '');
  const slugProductName = slugData.productName;
  const slugTitle = slugBrand && slugProductName
    ? `${slugBrand} ${slugProductName}`
    : slugProductName || slug.replace(/\s+/g, ' ').trim();

  console.log(`[AJIO-EXTRACT] Slug-derived brand: "${slugBrand}"`);
  console.log(`[AJIO-EXTRACT] Slug-derived title: "${slugTitle}"`);

  // ─── Layer 2+3: Direct Page Fetch → Structured Data Extraction ────
  // Try fetching the AJIO page directly with browser-like headers.
  // AJIO's Akamai blocks most requests, but mobile/desktop Chrome UA sometimes works.
  const userAgents = [
    // Mobile Chrome (highest success rate)
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    // Desktop Chrome
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // iPhone Safari
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ];

  for (let i = 0; i < userAgents.length; i++) {
    try {
      console.log(`[AJIO-EXTRACT] Direct fetch attempt ${i + 1}/${userAgents.length}...`);
      const res = await axios.get(cleanUrl, {
        headers: {
          'User-Agent': userAgents[i],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
        },
        maxRedirects: 5,
        timeout: 12000,
        validateStatus: (status: number) => status < 500, // Accept 200-499, retry on 5xx
      });

      if (res.status !== 200) {
        console.log(`[AJIO-EXTRACT] Direct fetch returned ${res.status}, trying next UA...`);
        continue;
      }

      const html = typeof res.data === 'string' ? res.data : '';
      if (html.length < 1000 || html.includes('Access Denied') || html.includes('Robot Check')) {
        console.log(`[AJIO-EXTRACT] Got blocked page (len=${html.length}), trying next UA...`);
        continue;
      }

      console.log(`[AJIO-EXTRACT] ✓ Got AJIO HTML (${html.length} bytes). Extracting structured data...`);

      // 3a. Try ld+json extraction (most reliable)
      const ldResult = extractAjioLdJson(html, productId, variant);
      if (ldResult.verified && ldResult.title && ldResult.imageUrl) {
        console.log(`[AJIO-EXTRACT] ✓ Verified via ld+json: "${ldResult.title}"`);
        return {
          title: ldResult.title,
          price: ldResult.price || '',
          imageUrl: ldResult.imageUrl,
          platform: 'ajio',
          url: cleanUrl,
          brand: ldResult.brand || slugBrand || 'AJIO'
        };
      }

      // 3b. Try __PRELOADED_STATE__ extraction
      const stateResult = extractAjioPreloadedState(html, productId, variant);
      if (stateResult.verified && stateResult.title) {
        // If we have title from state but no image, try ld+json image or og:image
        let imageUrl = stateResult.imageUrl || ldResult.imageUrl || '';
        if (!imageUrl) {
          const ogResult = extractAjioOgTags(html, productId);
          imageUrl = ogResult.imageUrl || '';
        }
        if (imageUrl) {
          console.log(`[AJIO-EXTRACT] ✓ Verified via __PRELOADED_STATE__: "${stateResult.title}"`);
          return {
            title: stateResult.title,
            price: stateResult.price || '',
            imageUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: stateResult.brand || slugBrand || 'AJIO'
          };
        }
      }

      // 3c. Try og tags extraction
      const ogResult = extractAjioOgTags(html, productId);
      if (ogResult.verified && ogResult.imageUrl) {
        const title = ogResult.title || ldResult.title || stateResult.title || slugTitle;
        console.log(`[AJIO-EXTRACT] ✓ Verified via og tags: "${title}"`);
        return {
          title,
          price: ogResult.price || ldResult.price || stateResult.price || '',
          imageUrl: ogResult.imageUrl,
          platform: 'ajio',
          url: cleanUrl,
          brand: ldResult.brand || stateResult.brand || slugBrand || 'AJIO'
        };
      }

      // 3d. Cheerio fallback for direct HTML selectors
      try {
        const $ = cheerio.load(html);
        const prodName = $('.prod-name').text().trim();
        const brandName = $('.brand-name').text().trim();
        const prodPrice = $('.prod-sp').text().replace(/[^\d.]/g, '');
        const prodImg = $('.rilrtl-lazy-img').attr('src') || $('meta[property="og:image"]').attr('content') || '';

        if (prodName && prodImg) {
          const title = brandName ? `${brandName} ${prodName}` : prodName;
          const imageUrl = prodImg.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
          console.log(`[AJIO-EXTRACT] ✓ Verified via cheerio selectors: "${title}"`);
          return {
            title,
            price: prodPrice || '',
            imageUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: brandName || slugBrand || 'AJIO'
          };
        }
      } catch (cheerioErr) { /* ignore */ }

      // 3e. Generic image extraction from HTML — find all AJIO CDN images with the product ID
      if (productId) {
        const imgPattern = new RegExp(`https?://assets[^"'\\s)]+${productId}[^"'\\s)]+`, 'g');
        const allImages: string[] = html.match(imgPattern) ?? [];
        if (allImages.length > 0) {
          // Prefer MODEL image
          const modelImg = allImages.find(u => u.includes('-MODEL.'));
          let imageUrl = (modelImg || allImages[0]).replace(/-\d+Wx\d+H-/, '-473Wx593H-');
          // Clean trailing garbage characters
          imageUrl = imageUrl.replace(/[)\]}"']+$/, '');
          const title = ogResult.title || ldResult.title || stateResult.title || slugTitle;
          console.log(`[AJIO-EXTRACT] ✓ Found product image in HTML via regex: "${title}"`);
          return {
            title,
            price: ogResult.price || ldResult.price || stateResult.price || '',
            imageUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: ldResult.brand || stateResult.brand || slugBrand || 'AJIO'
          };
        }
      }

      // If we got HTML but couldn't extract enough, continue to next UA
      console.log(`[AJIO-EXTRACT] Got HTML but insufficient structured data from attempt ${i + 1}`);
    } catch (fetchErr: any) {
      console.warn(`[AJIO-EXTRACT] Direct fetch attempt ${i + 1} failed: ${fetchErr.message}`);
    }
  }

  // ─── Layer 2b: ScrapingDog (if available) ─────────────────────────
  const sdKey = process.env.SCRAPINGDOG_API_KEY;
  if (sdKey && !scrapingDogQuotaExhausted) {
    try {
      console.log(`[AJIO-EXTRACT] Trying ScrapingDog dynamic render...`);
      const scrapeUrl = `https://api.scrapingdog.com/scrape?api_key=${sdKey}&url=${encodeURIComponent(cleanUrl)}&dynamic=true`;
      const res = await axios.get(scrapeUrl, { timeout: 25000 });
      const html = typeof res.data === 'string' ? res.data : '';

      if (html.length > 1000 && !html.includes('"success":false') && !html.includes('"message":"Limit reached')) {
        console.log(`[AJIO-EXTRACT] ScrapingDog returned ${html.length} bytes`);
        // Run same extraction pipeline
        const ldResult = extractAjioLdJson(html, productId, variant);
        if (ldResult.verified && ldResult.title && ldResult.imageUrl) {
          return {
            title: ldResult.title,
            price: ldResult.price || '',
            imageUrl: ldResult.imageUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: ldResult.brand || slugBrand || 'AJIO'
          };
        }

        const ogResult = extractAjioOgTags(html, productId);
        if (ogResult.verified && ogResult.imageUrl) {
          return {
            title: ogResult.title || slugTitle,
            price: ogResult.price || '',
            imageUrl: ogResult.imageUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: slugBrand || 'AJIO'
          };
        }
      } else {
        if (html.includes('"success":false') || html.includes('Limit reached')) {
          scrapingDogQuotaExhausted = true;
          console.warn(`[AJIO-EXTRACT] ScrapingDog quota exhausted.`);
        }
      }
    } catch (sdErr: any) {
      console.warn(`[AJIO-EXTRACT] ScrapingDog failed: ${sdErr.message}`);
      if (sdErr.response?.status === 403 || sdErr.response?.status === 429) {
        scrapingDogQuotaExhausted = true;
      }
    }
  }

  // ─── Layer 4: Jina Reader (legacy fallback) ───────────────────────
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    console.log(`[AJIO-EXTRACT] Trying Jina Reader: ${jinaUrl}`);
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

      // Verify it's not an "Access Denied" page
      if (pageTitle.includes('Access Denied') || content.includes('Access Denied')) {
        console.log(`[AJIO-EXTRACT] Jina Reader returned Access Denied page`);
      } else {
        const hasId = !productId || content.includes(productId) ||
          (metadata['og:url'] || '').includes(productId) ||
          (metadata['og:image'] || '').includes(productId);

        if (hasId) {
          let brand = '';
          const brandMatch = content.match(/##\s*([A-Z0-9\s&'-]+)\s*\n/i);
          if (brandMatch) brand = brandMatch[1].trim();
          if (!brand || brand.toLowerCase().includes('ajio')) brand = slugBrand;

          let title = '';
          if (pageTitle) {
            title = pageTitle
              .replace(/^Buy\s+/i, '')
              .replace(/\s+Online.*$/i, '')
              .replace(/\s*\|\s*AJIO.*$/i, '')
              .trim();
          }

          let price = '';
          const priceMatch = content.match(/₹([\d,]+)/);
          if (priceMatch) price = priceMatch[1].replace(/,/g, '');

          let imageUrl = '';
          const imgMatches = content.match(/https?:\/\/[^\s\)"']+\/medias\/sys_master\/[^\s\)"']+/g) || [];
          const modelImg = imgMatches.find(img =>
            (!productId || img.includes(productId)) &&
            (!variant || img.toLowerCase().includes(variant.toLowerCase())) &&
            img.includes('-MODEL.')
          ) || imgMatches.find(img =>
            (!productId || img.includes(productId))
          );

          if (modelImg) imageUrl = modelImg.replace(/-\d+Wx\d+H-/, '-473Wx593H-');
          else if (metadata['og:image']) imageUrl = metadata['og:image'].replace(/-\d+Wx\d+H-/, '-473Wx593H-');

          if (title && imageUrl) {
            console.log(`[AJIO-EXTRACT] ✓ Verified via Jina Reader: "${title}"`);
            return { title, price, imageUrl, platform: 'ajio', url: cleanUrl, brand: brand || slugBrand || 'AJIO' };
          }
        }
      }
    }
  } catch (jinaErr: any) {
    console.warn(`[AJIO-EXTRACT] Jina Reader failed: ${jinaErr.message}`);
  }

  // ─── Layer 5: URL-based construction with strict image search ─────
  // All page-fetching approaches failed. Use URL slug data for title/brand.
  // Search for the image ONLY accepting results that contain the exact product ID.
  console.log(`[AJIO-EXTRACT] All page-fetching methods failed. Using URL-based product construction.`);

  if (productId && slugTitle) {
    // Try to find a verified image and price from Google Shopping (strict ID match)
    const searchData = await searchAjioProductData(slugTitle, productId, variant);
    if (searchData) {
      console.log(`[AJIO-EXTRACT] ✓ URL-based product with verified image:`);
      console.log(`[AJIO-EXTRACT]   Product ID: ${productId}`);
      console.log(`[AJIO-EXTRACT]   Variant: ${variant}`);
      console.log(`[AJIO-EXTRACT]   Title: ${slugTitle}`);
      console.log(`[AJIO-EXTRACT]   Brand: ${slugBrand}`);
      console.log(`[AJIO-EXTRACT]   Image: ${searchData.imageUrl}`);
      console.log(`[AJIO-EXTRACT]   Price: ${searchData.price || '(none)'}`);
      return {
        title: slugTitle,
        price: searchData.price || '',
        imageUrl: searchData.imageUrl,
        platform: 'ajio',
        url: cleanUrl,
        brand: slugBrand || 'AJIO',
        productId,
        variant: variant || undefined,
      };
    }

    // Last resort: construct the AJIO CDN image URL pattern from og:image format
    // Pattern: https://assets.ajio.com/medias/sys_master/{path}/-{W}Wx{H}H-{id}-{variant}-MODEL.jpg
    // We don't know the exact CDN path, but the og:image URL is deterministic per product.
    // Try common CDN path roots.
    const cdnRoots = ['root1', 'root', 'images'];
    for (const root of cdnRoots) {
      try {
        // We can't know the exact date/hash path, but let's check if the product's
        // image is accessible at a preload URL we found earlier
        const testUrl = `https://assets.ajio.com/medias/sys_master/${root}/-473Wx593H-${productId}-${variant || 'default'}-MODEL.jpg`;
        const headRes = await axios.head(testUrl, { timeout: 5000, validateStatus: () => true });
        if (headRes.status === 200) {
          console.log(`[AJIO-EXTRACT] ✓ Found CDN image at: ${testUrl}`);
          return {
            title: slugTitle,
            price: '',
            imageUrl: testUrl,
            platform: 'ajio',
            url: cleanUrl,
            brand: slugBrand || 'AJIO'
          };
        }
      } catch (e) { /* ignore */ }
    }
  }

  // If exact verification truly fails, show a clear error
  console.error(`[AJIO-EXTRACT] ✗ All extraction methods failed for AJIO product ${productId}. Rejecting.`);
  throw new Error(`Unable to verify AJIO product ${productId || '(unknown)'}. The product page could not be accessed. Please try again later or use a different product URL.`);
}

// ─── MAIN PARSE FUNCTION ────────────────────────────────────────────────────

export async function parseProductUrl(url: string): Promise<ScrapedProduct> {
  const identifier = extractProductIdentifier(url);
  const { platform, id: productId, variant, slug: productSlug, brandFromSlug } = identifier;

  console.log(`[SCRAPER] Parsing URL: ${url}`);
  console.log(`[SCRAPER] Platform: ${platform}, ID: ${productId}, Variant: ${variant}, Brand: ${brandFromSlug}, Slug: "${productSlug}"`);

  // Fast-path & dedicated extractor for AJIO
  if (platform === 'ajio') {
    return await extractAjioProduct(url, productId, variant, productSlug, brandFromSlug);
  }

  let html = '';
  let finalUrl = url;
  
  try {
    const apiKey = process.env.SCRAPINGDOG_API_KEY;

    // Fast-path Myntra, Amazon, and Meesho: skip ScrapingDog to ensure speed
    const skipScrapingDog = platform === 'myntra' || platform === 'amazon' || platform === 'meesho';

    // 1. Try ScrapingDog only if not previously exhausted
    if (apiKey && !scrapingDogQuotaExhausted && !skipScrapingDog) {
      try {
        const isDynamic = platform === 'myntra' || platform === 'ajio';
        const scrapeUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(url)}&dynamic=${isDynamic}`;
        const response = await axios.get(scrapeUrl, { timeout: 15000 });
        const data = response.data;
        
        // Detect ScrapingDog limit / error payloads returned with HTTP 200
        if (
          (typeof data === 'object' && data !== null && (data.success === false || data.message)) ||
          (typeof data === 'string' && (data.includes('"message":"Limit reached') || data.includes('"success":false')))
        ) {
          console.warn(`[SCRAPER] ScrapingDog quota reached. Disabling ScrapingDog for future requests.`);
          scrapingDogQuotaExhausted = true;
        } else if (typeof data === 'string' && data.length > 500) {
          html = data;
        }
      } catch (sdError: any) {
        console.warn(`[SCRAPER] ScrapingDog failed for ${url}: ${sdError.message}, falling back...`);
        if (sdError.response?.status === 403 || sdError.response?.status === 429) {
          console.warn(`[SCRAPER] ScrapingDog returned ${sdError.response.status}. Disabling ScrapingDog for future requests.`);
          scrapingDogQuotaExhausted = true;
        }
      }
    }

    // 2. Native axios fetch with browser headers
    if (!html) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': platform === 'meesho' 
                ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'device-memory': '8',
            'downlink': '10',
            'dpr': '1',
          },
          maxRedirects: 5,
          timeout: 12000,
        });
        
        if (typeof response.data === 'string') {
          html = response.data;
          // Capture final redirected URL (e.g. for amzn.in shortlinks)
          if (response.request?.res?.responseUrl) {
            finalUrl = response.request.res.responseUrl;
          }
        }
      } catch (axiosErr: any) {
        console.warn(`[SCRAPER] Native axios failed (${axiosErr.message}) for ${url}`);
        // If redirect URL exists in error (e.g. 403 on redirected target)
        if (axiosErr.response?.request?.res?.responseUrl) {
          finalUrl = axiosErr.response.request.res.responseUrl;
        }
      }
    }

    // Re-extract identifier from final URL if redirected (e.g. amzn.in → amazon.in)
    let finalIdentifier = identifier;
    if (finalUrl !== url) {
      finalIdentifier = extractProductIdentifier(finalUrl);
      if (finalIdentifier.id && !identifier.id) {
        console.log(`[SCRAPER] Extracted ID from redirected URL: ${finalIdentifier.id}`);
      }
    }
    const effectiveId = finalIdentifier.id || identifier.id;
    const effectivePlatform = finalIdentifier.platform !== 'unknown' ? finalIdentifier.platform : platform;

    let title = '';
    let price = '';
    let imageUrl = '';
    let brand = '';
    let exactMatch = false; // Track if we got a verified exact match

    // Check if HTML is a CAPTCHA / bot protection page
    const isBotBlock = html.includes('validateCaptcha') || 
                       html.includes('Flipkart reCAPTCHA') || 
                       html.includes('Robot Check') || 
                       html.includes('Access Denied') || 
                       html.length < 1000;

    // ── 3. PLATFORM-SPECIFIC EXTRACTION ─────────────────────────────────

    if (html && !isBotBlock) {
      // ── MYNTRA: Use pdpData extraction (most reliable) ──
      if (effectivePlatform === 'myntra') {
        const myntraResult = extractMyntraPdpData(html, effectiveId);
        if (myntraResult.verified) {
          title = myntraResult.title || '';
          price = myntraResult.price || '';
          imageUrl = myntraResult.imageUrl || '';
          brand = myntraResult.brand || '';
          exactMatch = true;
        }
      }

      // ── Standard cheerio extraction for all platforms ──
      if (!exactMatch) {
        const $ = cheerio.load(html);

        // Standard OpenGraph fallback
        const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="og:title"]').attr('content');
        const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
        const ogPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="product:price:amount"]').attr('content');

        if (effectivePlatform === 'amazon') {
          title = $('#productTitle').text().trim() || ogTitle || '';
          price = $('.a-price-whole').first().text().replace(/[^\d.]/g, '')
            || $('.priceToPay .a-offscreen').first().text().replace(/[^\d.]/g, '')
            || $('#corePriceDisplay_desktop_feature_div .a-offscreen').first().text().replace(/[^\d.]/g, '')
            || ogPrice || '';

          // Extract price from script tags
          if (!price) {
            $('script').each((i, script) => {
              const content = $(script).html() || '';
              const priceMatch = content.match(/"priceAmount"\s*:\s*"?(\d+\.?\d*)"?/);
              if (priceMatch && priceMatch[1] && !price) price = priceMatch[1];
            });
          }

          // Image extraction
          const dynamicImageData = $('#landingImage').attr('data-a-dynamic-image');
          if (dynamicImageData) {
            try {
              const imgKeys = Object.keys(JSON.parse(dynamicImageData));
              imageUrl = imgKeys[0] || '';
            } catch (e) { /* ignore */ }
          }
          if (!imageUrl) {
            imageUrl = $('#landingImage').attr('data-old-hires')
              || $('#landingImage').attr('src')
              || $('#imgBlkFront').attr('src')
              || ogImage || '';
          }

          brand = $('#bylineInfo').text().replace('Visit the ', '').replace(' Store', '').trim() || '';
          if (title) exactMatch = true; // We got real data from the page
        } 
        else if (effectivePlatform === 'flipkart') {
          title = $('.B_NuCI').text().trim() || $('.VU-Tmb').text().trim() || $('h1').first().text().trim() || ogTitle || '';
          price = $('div.Nx9bqj.CxhGGd').text().replace(/[^\d.]/g, '') || $('._30jeq3._16Jk6d').text().replace(/[^\d.]/g, '') || ogPrice || '';
          imageUrl = $('img._396cs4._2amPTt._3qGmMb').attr('src') || $('img.DByuf4').attr('src') || ogImage || '';
          
          // Flipkart SPA often returns generic shell without product data
          // Check if the title is actually product-specific
          if (title && !title.includes('Flipkart.com') && title.length > 5) {
            exactMatch = true;
          }
        }
        else if (effectivePlatform === 'myntra') {
          // Fallback cheerio extraction if pdpData wasn't found
          const pdpTitle = $('.pdp-title').text().trim();
          const pdpName = $('.pdp-name').text().trim();
          title = (pdpTitle || pdpName) ? `${pdpTitle} ${pdpName}`.trim() : ogTitle || '';
          price = $('.pdp-price').text().replace(/[^\d.]/g, '') || ogPrice || '';

          // Myntra scripts often have images
          $('script').each((i, script) => {
            const content = $(script).html() || '';
            if (content.includes('pdpData')) {
              const match = content.match(/"imageURL":"([^"]+)"/);
              if (match && match[1] && !imageUrl) imageUrl = match[1];
            }
          });

          if (!imageUrl) imageUrl = $('.image-grid-image').css('background-image')?.replace(/url\(['"]?(.*?)['"]?\)/, '$1') || ogImage || '';
          brand = $('.pdp-title').text().trim() || '';
          if (title) exactMatch = true;
        }
        else if (effectivePlatform === 'ajio') {
          title = $('.prod-name').text().trim() || ogTitle || '';
          price = $('.prod-sp').text().replace(/[^\d.]/g, '') || ogPrice || '';
          imageUrl = $('.rilrtl-lazy-img').attr('src') || ogImage || '';
          brand = $('.brand-name').text().trim() || '';
          if (title) exactMatch = true;
        }
        else if (effectivePlatform === 'meesho') {
          title = $('h1').text().trim() || ogTitle || '';
          price = $('h4').first().text().replace(/[^\d.]/g, '') || ogPrice || '';
          
          // Meesho LD+JSON extraction via mobile agent
          $('script[type="application/ld+json"]').each((i, el) => {
            try {
              const json = JSON.parse($(el).html() || '{}');
              if (json['@type'] === 'Product') {
                if (json.name) title = json.name;
                if (json.image) imageUrl = Array.isArray(json.image) ? json.image[0] : json.image;
                if (json.offers?.price) price = String(json.offers.price).replace(/[^\d.]/g, '');
              }
            } catch(e){}
          });
          
          if (!imageUrl) imageUrl = ogImage || $('picture source').attr('srcset') || $('img').attr('src') || '';
          if (title && imageUrl) exactMatch = true;
        }
        else {
          title = ogTitle || $('title').text().trim() || '';
          imageUrl = ogImage || '';
          price = ogPrice || '';
          if (title) exactMatch = true;
        }
      }
    }

    // ── 4. RAPIDAPI FALLBACKS IF IMAGE STILL MISSING ─────────────────────
    const slugKeywords = extractSlugKeywords(finalUrl) || extractSlugKeywords(url);

    // Amazon ASIN-first lookup (most reliable for Amazon)
    if (effectivePlatform === 'amazon') {
      const asin = effectiveId || (() => {
        const m = finalUrl.match(/\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i) || url.match(/\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i);
        return m ? m[1].toUpperCase() : null;
      })();

      if (asin && (!imageUrl || !title || isBotBlock)) {
        const asinData = await fallbackAmazonDetails(asin);
        if (asinData.imageUrl) {
          imageUrl = asinData.imageUrl;
          exactMatch = true;
        }
        if (asinData.title && !title) title = asinData.title;
        if (asinData.price && !price) price = asinData.price;
      }
    }

    // Google Shopping / RapidAPI fallback — only if we still don't have a verified match
    if (!exactMatch && (!imageUrl || isBotBlock)) {
      const searchKeywords = title || slugKeywords;
      if (searchKeywords) {
        const searchData = await fallbackSearchProduct(
          searchKeywords,
          effectivePlatform,
          productSlug || slugKeywords,
          brandFromSlug
        );
        if (searchData.verified) {
          if (searchData.imageUrl) imageUrl = searchData.imageUrl;
          if (!title && searchData.title) title = searchData.title;
          if (!price && searchData.price) price = searchData.price;
          exactMatch = true;
        }
      }
    }

    // If we have no image and no exact match, try one more search with just slug keywords
    if (!imageUrl && !exactMatch && slugKeywords) {
      const lastResort = await fallbackSearchProduct(
        slugKeywords,
        effectivePlatform,
        productSlug || slugKeywords,
        brandFromSlug
      );
      if (lastResort.verified) {
        if (lastResort.imageUrl) imageUrl = lastResort.imageUrl;
        if (!title && lastResort.title) title = lastResort.title;
        if (!price && lastResort.price) price = lastResort.price;
      }
    }

    // Fallback title from slug if still empty
    if (!title && slugKeywords) {
      title = slugKeywords.replace(/\b\w/g, l => l.toUpperCase());
    }

    // Clean up results
    if (price && price.endsWith('.')) {
      price = price.slice(0, -1);
    }
    
    // Clean up escaped unicode in image URL
    if (imageUrl) {
      imageUrl = imageUrl.replace(/\\u002F/g, '/');
    }

    // ── 5. IMAGE URL NORMALIZATION ──────────────────────────────────────
    if (imageUrl) {
      // Fix protocol-relative URLs (//example.com/img.jpg)
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      
      // Fix relative URLs
      if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
        try {
          const urlObj = new URL(finalUrl || url);
          imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        } catch (e) { /* ignore */ }
      }

      // Upgrade Amazon image resolution: replace small suffixes with high-res _SL1500_
      if (imageUrl.includes('m.media-amazon.com') || imageUrl.includes('images-amazon.com')) {
        imageUrl = imageUrl.replace(/\._[A-Z]{2}_?[A-Z]*\d+_[A-Z]*\d*_?\./g, '._SL1500_.');
        imageUrl = imageUrl.replace(/\._[A-Z]{2}\d+_[A-Z]{2}\d+_[A-Z]{2}\d+_[A-Z]{2}\d+_\./g, '._SL1500_.');
      }

      // Ensure HTTPS
      if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }
    }

    // ── 6. FINAL VALIDATION ─────────────────────────────────────────────
    // If we couldn't verify the product identity, reject instead of returning wrong product
    if (!exactMatch && !imageUrl && !title) {
      throw new Error('Unable to verify this product. The store may be blocking automated access. Please try another product URL.');
    }

    // STRICT EXACT-PRODUCT RULE: Never substitute placeholder images.
    if (!imageUrl) {
      throw new Error(`Unable to verify product image for ${effectivePlatform}. Exact match required.`);
    }

    return {
      title: title || 'Imported Outfit',
      price: price || '999',
      imageUrl,
      platform: effectivePlatform,
      url: finalUrl || url,
      brand: brand || brandFromSlug || (effectivePlatform !== 'unknown' ? effectivePlatform.toUpperCase() : 'Premium Brand'),
    };
  } catch (error: any) {
    console.error(`Failed to parse URL (${url}):`, error.message);
    throw new Error(`Failed to extract product data: ${error.message}`);
  }
}
