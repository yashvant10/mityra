import config from '../config';
import { fetchFromScrapingdogMyntra } from './scrapingdogService';
import { scrapeFlipkartSearch, scrapeMyntraSearch } from './nativeScraperService';
import { scrapeQuickCommerceSearch } from './quickCommerceService';

// ─── Dynamic RapidAPI Getters ────────────────────────────────────────────────
function getRapidApiKey(): string {
  // Prefer the canonical RAPIDAPI_KEY from centralized config,
  // fallback to legacy REACT_APP_ convention for backward compat
  return config.rapidapi?.key || (process.env.RAPIDAPI_KEY || process.env.REACT_APP_RAPIDAPI_KEY || '').trim();
}
function getSearchHost(): string {
  return (process.env.REACT_APP_SEARCH_HOST || 'real-time-product-search.p.rapidapi.com').trim();
}

export interface RealProduct {
  id: string;
  name: string;
  title: string;
  price: string | null;
  originalPrice: string | null;
  discount: string | null;
  imageUrl: string;
  image: string;
  description: string;
  rating: number | null;
  reviews: number | null;
  brand: string | null;
  store: "flipkart" | "amazon" | "myntra" | "ajio" | "meesho";
  platform: "flipkart" | "amazon" | "myntra" | "ajio" | "meesho";
  gender: "male" | "female";
  productUrl: string;
}

// Helper: parse price to pretty string — returns null if price is missing/invalid
function formatPrice(priceVal: any): string | null {
  if (priceVal === null || priceVal === undefined || priceVal === '') return null;
  const str = String(priceVal);
  const numStr = str.replace(/[^\d.]/g, '');
  if (!numStr || isNaN(Number(numStr))) return null;
  // If the original string already has a currency symbol, return cleaned version
  const intVal = Math.round(Number(numStr));
  return `₹${intVal}`;
}

// Helper: extract original price if present
function extractOriginalPrice(item: any): string | null {
  const raw = item.typical_price_range?.[1] ||
    item.original_price ||
    item.old_price ||
    item.mrp ||
    item.offer?.original_price ||
    item.product_original_price ||
    null;
  return formatPrice(raw);
}

// Helper: extract discount if present
function extractDiscount(item: any): string | null {
  const raw = item.product_discount || item.discount || item.offer?.discount || item.discount_percent || null;
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str || str === '0' || str === '0%') return null;
  // Normalize: ensure it has a % sign if it's just a number
  if (/^\d+$/.test(str)) return `${str}% off`;
  return str;
}

// Helper: extract brand if present
function extractBrand(item: any): string | null {
  const raw = item.product_brand || item.brand || item.offer?.brand || item.manufacturer || null;
  if (!raw) return null;
  const str = String(raw).trim();
  return str || null;
}

function getActualStore(item: any, requestedStore: string): "flipkart" | "amazon" | "myntra" | "ajio" | "meesho" {
  const itemUrl = String(item.product_page_url || item.offer?.offer_page_url || item.url || item.link || '').toLowerCase();
  if (itemUrl.includes('flipkart.com')) return 'flipkart';
  if (itemUrl.includes('amazon.in') || itemUrl.includes('amazon.com') || itemUrl.includes('amzn.')) return 'amazon';
  if (itemUrl.includes('myntra.com')) return 'myntra';
  if (itemUrl.includes('ajio.com')) return 'ajio';
  if (itemUrl.includes('meesho.com')) return 'meesho';

  const storeName = String(
    item.offer?.store_name || 
    item.store_name || 
    item.store || 
    item.source || 
    item.source_name || 
    item.merchant || 
    item.seller || 
    requestedStore ||
    'amazon'
  ).toLowerCase();
  
  if (storeName.includes('amazon') || storeName.includes('amzn')) return 'amazon';
  if (storeName.includes('flipkart')) return 'flipkart';
  if (storeName.includes('myntra')) return 'myntra';
  if (storeName.includes('ajio')) return 'ajio';
  if (storeName.includes('meesho')) return 'meesho';
  
  return requestedStore as any || 'amazon';
}

// ─── Unified Product Search via Google Shopping ─────────────────────────────
function buildSearchQueries(gender: "male" | "female", category: string, occasion: string, style?: string): string[] {
  const g = gender === "male" ? "men" : "women";
  
  const catKey = category.toLowerCase().replace(/[^a-z]/g, "");
  const occKey = occasion.toLowerCase().replace(/[^a-z]/g, "");

  let catTerm = "";
  if (catKey.includes("tshirt")) catTerm = "t shirt";
  else if (catKey.includes("shirt")) catTerm = "shirt";
  else if (catKey.includes("pant") || catKey.includes("jean") || catKey.includes("trouser")) catTerm = "pants";
  else if (catKey.includes("dress")) catTerm = gender === "male" ? "sherwani" : "dress";
  else if (catKey.includes("jacket") || catKey.includes("coat") || catKey.includes("hoodie")) catTerm = "jacket";
  else if (catKey.includes("kurta") || catKey.includes("ethnic")) {
    catTerm = gender === "male" ? "kurta" : "kurti";
  }
  else if (catKey.includes("suit") || catKey.includes("blazer")) catTerm = "blazer suit";
  else if (catKey.includes("shoe") || catKey.includes("footwear")) catTerm = "shoes";
  else if (catKey.includes("short")) catTerm = "shorts";
  else catTerm = "accessories";

  let styleTerm = "";
  if (style) {
    const styleKey = style.toLowerCase().replace(/[^a-z ]/g, "").trim();
    if (styleKey === "polo") styleTerm = "polo";
    else if (styleKey === "oversized") styleTerm = "oversized";
    else if (styleKey === "formal") styleTerm = "formal";
    else styleTerm = styleKey;
  }

  // Generate permutations
  const queries: string[] = [];

  // 1. Primary combination (Highly specific)
  let q1 = `${g} ${styleTerm} ${catTerm} ${occKey} wear`.trim().replace(/\s+/g, ' ');
  queries.push(q1);

  // 2. Secondary combination (Broader style focus)
  if (styleTerm) {
    queries.push(`${g} ${styleTerm} ${catTerm}`.trim().replace(/\s+/g, ' '));
  }

  // 3. Fallback combinations based on Occasion
  if (occKey === 'college' || occKey === 'casual') {
    queries.push(`${g} ${catTerm} casual wear`.trim().replace(/\s+/g, ' '));
    queries.push(`${g} ${catTerm} everyday wear`.trim().replace(/\s+/g, ' '));
  } else if (occKey === 'festival' || occKey === 'wedding') {
    queries.push(`${g} festive wear`.trim().replace(/\s+/g, ' '));
    queries.push(`${g} ethnic wear`.trim().replace(/\s+/g, ' '));
    queries.push(`${g} traditional wear`.trim().replace(/\s+/g, ' '));
  } else if (occKey === 'office' || occKey === 'interview') {
    queries.push(`${g} formal ${catTerm}`.trim().replace(/\s+/g, ' '));
    queries.push(`${g} office wear ${catTerm}`.trim().replace(/\s+/g, ' '));
  } else if (occKey === 'party') {
    queries.push(`${g} party wear ${catTerm}`.trim().replace(/\s+/g, ' '));
  }

  // 4. Ultimate fallback (Just gender and category)
  queries.push(`${g} ${catTerm}`.trim().replace(/\s+/g, ' '));

  // Deduplicate array preserving order
  return Array.from(new Set(queries));
}

// ─── In-memory cache for product search ─────────────────────────────────────
// Only stores SUCCESSFUL real API results — never caches empty or failed responses
const productsCache = new Map<string, { products: RealProduct[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours cache duration

// ─── Helper: Build cache key ─────────────────────────────────────────────────
function buildCacheKey(
  store: string,
  gender: string,
  category?: string,
  occasion?: string,
  customQuery?: string,
  style?: string
): string {
  if (customQuery) {
    return `${store}_${gender}_custom_${Buffer.from(customQuery).toString('hex').substring(0, 32)}`;
  }
  return `${store}_${gender}_${(category || 'T-Shirts').toLowerCase()}_${(style || 'none').toLowerCase()}_${(occasion || 'Casual').toLowerCase()}`;
}

// ─── Targeted Store API Fetcher ─────────────────────────────────────────────
async function fetchFromTargetedStoreApi(
  store: "flipkart" | "amazon" | "myntra" | "ajio" | "meesho",
  gender: "male" | "female",
  query: string,
  key: string,
  page: number = 1
): Promise<RealProduct[]> {
  if (store === "amazon") {
    const host = "real-time-amazon-data.p.rapidapi.com";
    const url = `https://${host}/search?query=${encodeURIComponent(query)}&country=IN&page=${page}`;

    console.log(`[RAPIDAPI] Fetching from TARGETED API: ${url} (Host: ${host})`);
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      signal: AbortSignal.timeout(10000), 
    });

    if (res.status === 429) throw new Error(`RATE_LIMIT: Targeted API rate limited (429)`);
    if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: Targeted API authentication failed (${res.status})`);
    if (res.status === 404) throw new Error(`NOT_FOUND: Targeted API endpoint not found (404)`);
    if (!res.ok) throw new Error(`Targeted API HTTP ${res.status}`);

    const data = await res.json() as any;
    return parseProductsData(data, store, gender);
  } else if (store === "flipkart") {
    const host = "flipkart-product-data-api.p.rapidapi.com";
    const url = `https://${host}/flipkart/v1/browse`;
    // ReefAPI requires passing the flipkart search URL in the body
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&page=${page}`;

    console.log(`[RAPIDAPI] Fetching from TARGETED API: ${url} (Host: ${host}) with payload ${searchUrl}, page: ${page}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      body: JSON.stringify({ url: searchUrl }),
      signal: AbortSignal.timeout(15000), 
    });

    if (res.status === 429) throw new Error(`RATE_LIMIT: Targeted API rate limited (429)`);
    if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: Targeted API authentication failed (${res.status})`);
    if (res.status === 404) throw new Error(`NOT_FOUND: Targeted API endpoint not found (404)`);
    if (!res.ok) throw new Error(`Targeted API HTTP ${res.status}`);

    const data = await res.json() as any;
    return parseProductsData(data, store, gender);
  } else {
    throw new Error(`Real products are currently unavailable for this platform (${store}). Data unavailable.`);
  }
}

// ─── Backup Product Search API Fetcher (with 1 retry) ───────────────────────
async function fetchFromProductSearchApi(
  store: "flipkart" | "amazon" | "myntra" | "ajio" | "meesho",
  gender: "male" | "female",
  query: string,
  key: string,
  page: number = 1
): Promise<RealProduct[]> {
  const host = getSearchHost();
  // Append store name to query to help Google Shopping find the right products
  const storeSpecificQuery = `${query} ${store}`;
  const url = `https://${host}/search?q=${encodeURIComponent(storeSpecificQuery)}&country=in&language=en&page=${page}`;

  console.log(`[RAPIDAPI] Fetching from BACKUP API (Google Shopping): ${url} (Host: ${host})`);
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': host,
    },
    signal: AbortSignal.timeout(15000), 
  });

  if (res.status === 429) throw new Error(`RATE_LIMIT: Backup API rate limited (429)`);
  if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: Backup API authentication failed (${res.status})`);
  if (!res.ok) throw new Error(`Backup API HTTP ${res.status}`);

  const data = await res.json() as any;
  const parsed = parseProductsData(data, store, gender);
  
  // CRITICAL: Filter out fabricated products. Only return products that actually belong to the requested store.
  const filtered = parsed.filter(p => p.store === store);
  console.log(`[RAPIDAPI] Backup API returned ${parsed.length} items. Filtered to ${filtered.length} belonging to ${store}.`);
  return filtered;
}

// ─── Response Parser ─────────────────────────────────────────────────────────
function parseProductsData(data: any, store: string, gender: "male" | "female"): RealProduct[] {
  // Safely parse the products array supporting multiple schemas
  const rawProducts = data.data?.products || 
                      data.data?.results || 
                      data.products || 
                      data.data || 
                      data.results || 
                      (Array.isArray(data) ? data : []);

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return [];
  }

  return rawProducts
    .map((item: any, idx: number) => {
      const name = item.product_title || item.title || item.name || item.product_name || null;
      if (!name) return null; // Skip items without a name — they're garbage data

      const price = formatPrice(item.offer?.price || item.price || item.typical_price_range?.[0] || item.product_price || null);
      const originalPrice = extractOriginalPrice(item);
      const discount = extractDiscount(item);
      const brand = extractBrand(item);
      
      // Prefer alternative images (index 1) over the primary image (index 0) if a gallery exists,
      // because the primary image usually features a human model, while alternates are often product-only flat-lays.
      let imageUrl = null;
      if (Array.isArray(item.product_photos) && item.product_photos.length > 1) {
        imageUrl = item.product_photos[1];
      } else if (Array.isArray(item.images) && item.images.length > 1) {
        imageUrl = item.images[1];
      } else {
        imageUrl = (Array.isArray(item.product_photos) ? item.product_photos[0] : null) || 
                   item.product_photo ||
                   item.thumbnail || 
                   item.image || 
                   item.image_url ||
                   item.imageUrl ||
                   item.thumbnail_url ||
                   (Array.isArray(item.images) ? item.images[0] : null) || 
                   item.product_image ||
                   item.offer?.image ||
                   null;
      }
      
      if (!imageUrl) return null; // Skip items without images — can't display them

      const actualStore = getActualStore(item, store);
      
      // Extract direct affiliate / platform product page url
      let productUrl = item.product_page_url || 
                       item.offer?.offer_page_url || 
                       item.offer_url || 
                       item.product_url || 
                       item.url || 
                       item.link || 
                       item.product_link || 
                       item.offer?.offer_url ||
                       item.product_offers?.[0]?.offer_page_url;

      // Use URL if it is a valid absolute HTTP link, otherwise fall back to search URL
      if (!productUrl || typeof productUrl !== "string" || !productUrl.startsWith("http")) {
        if (actualStore === 'myntra') productUrl = `https://www.myntra.com/${encodeURIComponent(name)}`;
        else if (actualStore === 'ajio') productUrl = `https://www.ajio.com/search/?text=${encodeURIComponent(name)}`;
        else if (actualStore === 'flipkart') productUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(name)}`;
        else if (actualStore === 'amazon') productUrl = `https://www.amazon.in/s?k=${encodeURIComponent(name)}`;
        else productUrl = `https://www.meesho.com/search?q=${encodeURIComponent(name)}`;
      }

      // Rating: only use if it's a real number, don't invent
      const rawRating = item.product_rating || item.rating || item.product_star_rating || null;
      const rating = rawRating !== null && rawRating !== undefined && !isNaN(Number(rawRating)) ? Number(rawRating) : null;

      // Reviews/Usage stats: use real counts, don't invent
      const rawReviews = item.product_num_reviews || item.num_ratings || item.product_num_ratings || item.review_count || item.reviews || null;
      const reviews = rawReviews !== null && rawReviews !== undefined && !isNaN(Number(rawReviews)) ? Number(rawReviews) : null;

      return {
        id: `rgen_${actualStore}_${item.product_id || item.id || idx}`,
        name,
        title: name,
        price,
        originalPrice,
        discount,
        brand,
        imageUrl,
        image: imageUrl,
        description: item.product_description || item.description || '',
        rating,
        reviews,
        store: actualStore as any,
        platform: actualStore as any,
        gender,
        productUrl,
      };
    })
    .filter((item: RealProduct | null): item is RealProduct => item !== null);
}

function calculateRelevanceScore(
  product: RealProduct,
  gender: string,
  category?: string,
  style?: string,
  occasion?: string
): number {
  let score = 0;
  const title = product.name.toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  
  const text = `${title} ${desc} ${brand}`;
  
  // 1. Gender Match (boost)
  if (gender === 'male' && (text.includes('men') || text.includes('boy'))) score += 25;
  if (gender === 'female' && (text.includes('women') || text.includes('girl') || text.includes('lady'))) score += 25;
  
  // 2. Category Match
  if (category) {
    const catWords = category.toLowerCase().replace(/&/g, '').split(/\s+/).filter(w => w.length > 2);
    let catMatch = false;
    for (const w of catWords) {
      if (text.includes(w)) {
        score += 10;
        catMatch = true;
        break; // Only need one match to get the boost
      }
    }
    if (catMatch && catWords.some(w => title.includes(w))) score += 10;
  }
  
  // 3. Style Match
  if (style) {
    const styleWords = style.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let styleMatch = false;
    for (const w of styleWords) {
      if (text.includes(w)) {
        score += 40; // Style is highly distinguishing
        styleMatch = true;
        break;
      }
    }
    if (styleMatch && styleWords.some(w => title.includes(w))) score += 20;
  }
  
  // 4. Occasion Match (Synonym/Concept mapping based on user instructions)
  if (occasion) {
    const occMap: Record<string, string[]> = {
      college: ['college', 'campus', 'student', 'casual', 'everyday', 'daily wear', 'casual wear', 'polo', 't-shirt', 'tshirt', 'jeans', 'sneakers', 'hoodie', 'shirt', 'overshirt', 'sweatshirt', 'cargo', 'chinos', 'relaxed', 'streetwear'],
      office: ['office', 'formal', 'workwear', 'business', 'professional', 'smart casual', 'formal shirt', 'trousers', 'chinos', 'blazer', 'polo', 'oxford', 'loafers'],
      casual: ['casual', 'everyday', 'daily wear', 'relaxed', 'streetwear', 't-shirt', 'tshirt', 'jeans', 'cargo', 'hoodie', 'sweatshirt', 'sneakers'],
      festival: ['festival', 'festive', 'ethnic', 'traditional', 'kurta', 'kurti', 'ethnic wear', 'traditional wear', 'sherwani', 'lehenga', 'saree', 'anarkali', 'salwar', 'dupatta', 'embroidered', 'printed ethnic', 'celebration', 'wedding', 'cultural'],
      party: ['party', 'partywear', 'party wear', 'club', 'evening', 'sequin', 'glitter', 'stylish', 'statement'],
      wedding: ['wedding', 'wedding wear', 'ethnic', 'traditional', 'sherwani', 'kurta', 'lehenga', 'saree', 'anarkali', 'embroidered', 'festive'],
      interview: ['interview', 'formal', 'professional', 'business', 'office', 'formal shirt', 'trousers', 'blazer', 'chinos']
    };
    
    // Add fallback for ones not exactly matched above (like datenight or travel)
    occMap.datenight = ['date', 'night', 'evening', 'smart', 'stylish', 'slim', 'elegant'];
    occMap.travel = ['travel', 'comfort', 'easy', 'track', 'jogger', 'casual', 'relaxed'];

    const occKeywords = occMap[occasion.toLowerCase()] || [occasion.toLowerCase()];
    let occMatch = false;
    for (const w of occKeywords) {
      if (text.includes(w)) {
        score += 20;
        occMatch = true;
        break;
      }
    }
    if (occMatch && occKeywords.some(w => title.includes(w))) score += 10;
    
    // 5. Occasion Penalties (Force differentiation)
    if (occasion.toLowerCase() === 'office' || occasion.toLowerCase() === 'interview') {
      if (text.includes('graphic') || text.includes('funky') || text.includes('party')) score -= 25;
      if (text.includes('casual') && !text.includes('smart casual') && !text.includes('business casual')) score -= 15;
    }
    if (occasion.toLowerCase() === 'college' || occasion.toLowerCase() === 'casual') {
      if (text.includes('formal') || text.includes('business') || text.includes('office wear')) score -= 25;
    }
  }
  
  // General fashion relevance boost
  if (text.includes('clothing') || text.includes('apparel') || text.includes('wear')) score += 5;

  return score;
}

// ─── Main Exported Search Function ──────────────────────────────────────────
export async function searchRealProducts(
  store: "flipkart" | "amazon" | "myntra" | "ajio" | "meesho",
  gender: "male" | "female",
  occasion?: string,
  category?: string,
  style?: string,
  customQuery?: string,
  page: number = 1,
  limit: number = 20
): Promise<RealProduct[]> {
  const key = getRapidApiKey();
  const queries = customQuery ? [customQuery] : buildSearchQueries(gender, category || "T-Shirts", occasion || "Casual", style);
  
  // Redact key in logs for security
  console.log(`[RAPIDAPI] API Key present: ${!!key && key.length > 5}`);
  console.log(`[RAPIDAPI] Primary Search: "${queries[0]}" for store=${store}, gender=${gender}, page=${page}`);

  if (!key) {
    console.error('[RAPIDAPI] API key is missing! Cannot fetch real products. Check RAPIDAPI_KEY in .env');
    return [];
  }

  // 1. Check in-memory cache (only contains successful real results)
  const cacheKey = buildCacheKey(store, gender, category, occasion, customQuery, style) + `_page_${page}`;
  const cached = productsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[RAPIDAPI-CACHE] Serving cached products for: ${cacheKey}`);
    return cached.products; // Return all cached products for this page
  }

  // If we don't have cache, it means cache expired or it's a new page. We must refetch.
  let allFilteredProducts: RealProduct[] = [];
  let apiError: string | null = null;
  const uniqueProductsMap = new Map<string, RealProduct>();

  const maxQueries = 3; // Capped to avoid burning quota
  const queriesToRun = queries.slice(0, maxQueries);
  
  console.log(`[RAPIDAPI] Planned queries:`, queriesToRun);

  // 2. Iterate through queries until we have enough valid products
  for (let i = 0; i < queriesToRun.length; i++) {
    const query = queriesToRun[i];
    console.log(`[RAPIDAPI] Executing Query ${i+1}/${queriesToRun.length}: "${query}" (Page: ${page})`);
    
    let products: RealProduct[] = [];
    
    // 1. Try QuickCommerce Service first for supported platforms
    if (store === 'amazon' || store === 'flipkart' || store === 'myntra') {
      try {
        console.log(`[RAPIDAPI] Trying QuickCommerce Service first for ${store}...`);
        products = await scrapeQuickCommerceSearch(store, gender, query, page);
      } catch (qcErr: any) {
        console.warn(`[QUICKCOMMERCE] QuickCommerce failed for ${store}: ${qcErr.message}`);
      }
    }

    // 2. If QuickCommerce didn't return enough products (e.g. page 3 exhaustion or failure), fallback to existing providers to fill the gap.
    if (products.length < 20 || store === 'ajio' || store === 'meesho') {
      let fallbackProducts: RealProduct[] = [];
      try {
        if (store === 'myntra') {
          fallbackProducts = await fetchFromScrapingdogMyntra(query, page);
        } else if (store !== 'meesho') {
          fallbackProducts = await fetchFromTargetedStoreApi(store, gender, query, key, page);
        }
      } catch (err: any) {
        const apiName = store === 'myntra' ? 'ScrapingDog Myntra' : 'Targeted RapidAPI';
        console.warn(`[API] ${apiName} failed for ${store}: ${err.message}. Trying fallbacks...`);
        
        let nativeSucceeded = false;
        try {
          if (store === 'flipkart') {
            console.log(`[RAPIDAPI] Falling back to Native Scraper for ${store}...`);
            fallbackProducts = await scrapeFlipkartSearch(query, gender, page);
            apiError = null; // Clear error if native scraper works
            nativeSucceeded = true;
          } else if (store === 'myntra') {
            console.log(`[RAPIDAPI] Falling back to Native Scraper for ${store}...`);
            fallbackProducts = await scrapeMyntraSearch(query, gender, page);
            apiError = null;
            nativeSucceeded = true;
          }
        } catch (nativeErr: any) {
          console.warn(`[NATIVE_SCRAPER] Native scraper failed for ${store}: ${nativeErr.message}`);
        }

        if (!nativeSucceeded) {
          try {
            console.log(`[RAPIDAPI] Falling back to Backup Product Search API for ${store}...`);
            fallbackProducts = await fetchFromProductSearchApi(store, gender, query, key, page);
            apiError = null;
          } catch (backupErr: any) {
            console.error(`[RAPIDAPI] Backup Product Search API also failed: ${backupErr.message}`);
            apiError = backupErr.message;
          }
        }

        if (apiError && apiError.includes('no legitimate fallback')) {
          console.warn(`[RAPIDAPI] Fatal API error detected for ${store}. Breaking query loop early to prevent timeout.`);
          break;
        }
      }
      
      products = [...products, ...fallbackProducts];
    }

    // Filter the raw products
    const filteredProducts = (products || [])
      .filter((prod) => {
        const titleLower = prod.name.toLowerCase();
        const descLower = (prod.description || '').toLowerCase();

        // STRICT NEGATIVE FILTER: Remove food, electronics, cosmetics, etc.
        const spamTerms = ["mint", "candy", "chocolate", "food", "grocery", "snack", "nestlé", "nestle", "perfume", "cosmetic", "shampoo", "cream", "lotion", "soap", "facewash", "phone", "mobile", "laptop", "earphone", "headphone", "electronics", "cable", "charger", "watch", "smartwatch", "case", "cover"];
        const hasSpamTerm = spamTerms.some(term => titleLower.includes(term));
        if (hasSpamTerm) {
          // Whitelist: polo shirts are clothes, not mints
          if (titleLower.includes("polo") && (titleLower.includes("shirt") || titleLower.includes("t-shirt") || titleLower.includes("tshirt") || descLower.includes("clothing"))) {
            // Keep it
          } else {
            return false;
          }
        }

        // STRICT POSITIVE FILTER: Must contain a clothing/fashion related term
        const clothingTerms = ["shirt", "t-shirt", "tshirt", "tee", "polo", "top", "pant", "jean", "trouser", "dress", "skirt", "kurta", "kurti", "saree", "lehenga", "suit", "blazer", "jacket", "coat", "hoodie", "sweater", "sweatshirt", "wear", "clothing", "apparel", "garment", "shoe", "sneaker", "boot", "sandal", "footwear", "accessory", "bag", "belt", "tie"];
        const hasClothingTerm = clothingTerms.some(term => titleLower.includes(term) || descLower.includes(term));
        if (!hasClothingTerm) {
          return false;
        }

        // GENDER FILTER: Separate men's and women's items
        if (gender === "male") {
          const feminineTerms = ["women", "woman", "girl", "lady", "ladies", "female", "saree", "kurti", "lehenga", "palazzo", "gown", "top for women", "girls"];
          const hasFeminineTerm = feminineTerms.some(term => titleLower.includes(term));
          if (hasFeminineTerm) {
            return false;
          }
        } else {
          const masculineTerms = ["mens ", "men's", " men ", " boys ", "boy ", "male shirt", "male blazer"];
          const hasMasculineTerm = masculineTerms.some(term => titleLower.includes(term) && !titleLower.includes("women"));
          if (hasMasculineTerm) {
            return false;
          }
        }
        return true;
      });

    // Deduplicate and aggregate
    filteredProducts.forEach(p => {
      // Use combination of Store + Product ID + Canonical URL as requested
      const canonicalUrl = p.productUrl ? p.productUrl.split('?')[0] : '';
      const dedupeKey = `${p.store}_${p.id}_${canonicalUrl}`;
      if (!uniqueProductsMap.has(dedupeKey)) {
        uniqueProductsMap.set(dedupeKey, p);
      }
    });

    console.log(`[RAPIDAPI-TRACKING] Query: "${query}" | Raw: ${products.length} | Filtered: ${filteredProducts.length} | Unique Total: ${uniqueProductsMap.size}`);

    // Break early if we've accumulated a healthy buffer
    if (uniqueProductsMap.size >= limit * 2) {
      console.log(`[RAPIDAPI] Reached healthy buffer of ${uniqueProductsMap.size} unique products. Stopping fallbacks.`);
      break;
    }
  }

  allFilteredProducts = Array.from(uniqueProductsMap.values());

  // 5. Relevance Scoring & Sorting
  if (allFilteredProducts.length > 0) {
    const scoredProducts = allFilteredProducts.map(prod => {
      const score = calculateRelevanceScore(prod, gender, category, style, occasion);
      return { prod, score };
    });
    
    // Sort descending by score
    scoredProducts.sort((a, b) => b.score - a.score);
    
    console.log(`[DEBUG-SCORES] Occasion: ${occasion}`);
    scoredProducts.slice(0, 3).forEach((sp, idx) => {
      console.log(`[DEBUG-SCORES] #${idx+1} Score: ${sp.score} | Title: ${sp.prod.name.substring(0,50)}...`);
    });
    
    allFilteredProducts = scoredProducts.map(sp => sp.prod);
  } else {
    allFilteredProducts = [];
    if (apiError) {
      console.warn(`[RAPIDAPI] Last error was: ${apiError}`);
      // Return gracefully so we don't crash the frontend. We can throw an error if it's completely unhandled, 
      // but to satisfy "Do NOT hide the error", we will throw it so it displays on the frontend.
      throw new Error(apiError);
    }
  }

  // 6. Cache ONLY if we got real products from the API
  if (allFilteredProducts.length > 0) {
    productsCache.set(cacheKey, { products: allFilteredProducts, timestamp: Date.now() });
    console.log(`[RAPIDAPI-CACHE] Cached ${allFilteredProducts.length} real items for key: ${cacheKey}`);
  } else {
    // Don't cache empty results — next request should retry the API
    console.warn(`[RAPIDAPI] No real products found for ${store}/${gender}/[Queries]. NOT caching empty result.`);
  }

  // 7. Return the exactly limit products (safely capping the buffer)
  return allFilteredProducts.slice(0, limit);
}
