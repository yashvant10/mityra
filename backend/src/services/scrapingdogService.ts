import { RealProduct } from './rapidapiService';

// Fallback to node-fetch if global fetch is undefined (useful for older Node versions, though Node 18+ has it)
const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

export async function fetchFromScrapingdogMyntra(query: string, page: number = 1): Promise<RealProduct[]> {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  if (!apiKey) {
    throw new Error('SCRAPINGDOG_API_KEY is missing in backend environment variables.');
  }

  const endpoint = 'https://api.scrapingdog.com/myntra/search';
  // Use rawQuery exactly as tested
  const testUrl = `https://www.myntra.com/${encodeURIComponent(query.replace(/\s+/g, '-'))}?rawQuery=${encodeURIComponent(query)}&p=${page}`;
  const requestUrl = `${endpoint}?api_key=${apiKey}&url=${encodeURIComponent(testUrl)}`;

  console.log(`[SCRAPINGDOG] Fetching Myntra products for query: "${query}"`);

  const response = await _fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`Scrapingdog API failed with status ${response.status}`);
  }

  const data = await response.json();
  const searchResults = data.search_results || [];

  console.log(`[SCRAPINGDOG] Received ${searchResults.length} products for query: "${query}"`);

  return searchResults
    .map((item: any, idx: number): RealProduct | null => {
      const name = item.productName || item.product;
      if (!name) return null; // Skip invalid items

      // Extract best image
      let imageUrl = item.searchImage;
      if (!imageUrl && Array.isArray(item.images) && item.images.length > 0) {
        imageUrl = item.images[0].src || item.images[0];
      }
      if (!imageUrl) return null; // Must have image

      // Price processing
      const priceVal = item.price || item.mrp || 0;
      const originalPriceVal = item.mrp || item.price || 0;
      
      const price = priceVal ? `₹${priceVal}` : null;
      const originalPrice = originalPriceVal && originalPriceVal !== priceVal ? `₹${originalPriceVal}` : null;
      
      let discount = item.discountLabel || item.discountDisplayLabel || null;
      if (!discount && item.discount > 0) {
        discount = `${item.discount}% OFF`;
      }

      // Format URL properly
      let productUrl = item.landingPageUrl || item.productUrl;
      if (productUrl && !productUrl.startsWith('http')) {
        // Remove leading slash if exists
        productUrl = `https://www.myntra.com/${productUrl.replace(/^\/+/, '')}`;
      } else if (!productUrl) {
        // Fallback
        productUrl = `https://www.myntra.com/${encodeURIComponent(name.replace(/\s+/g, '-'))}`;
      }

      // Ratings
      const rating = typeof item.rating === 'number' && !isNaN(item.rating) ? Number(item.rating.toFixed(1)) : null;
      const reviews = typeof item.ratingCount === 'number' ? item.ratingCount : null;

      const realProduct: RealProduct = {
        id: `myntra_${item.productId || Date.now()}_${idx}`,
        name,
        title: name,
        brand: item.brand || null,
        price,
        originalPrice,
        discount,
        imageUrl,
        image: imageUrl,
        description: item.additionalInfo || name,
        rating,
        reviews,
        store: 'myntra',
        platform: 'myntra',
        gender: item.gender ? item.gender.toLowerCase() : 'unisex',
        productUrl
      };

      return realProduct;
    })
    .filter((p: RealProduct | null): p is RealProduct => p !== null);
}
