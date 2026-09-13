import fetch from 'node-fetch';
import { RealProduct } from './rapidapiService';

function getQuickCommerceKey(): string {
  const key = process.env.QUICKCOMMERCE_API_KEY;
  if (!key) throw new Error("QUICKCOMMERCE_API_KEY environment variable is not set");
  return key;
}

export async function scrapeQuickCommerceSearch(
  store: "flipkart" | "amazon" | "myntra",
  gender: "male" | "female",
  query: string,
  page: number = 1
): Promise<RealProduct[]> {
  const key = getQuickCommerceKey();
  
  // Format platform name for QuickCommerce API
  let platformName = "";
  if (store === "amazon") platformName = "Amazon";
  else if (store === "flipkart") platformName = "Flipkart";
  else if (store === "myntra") platformName = "Myntra";
  else {
    throw new Error(`QuickCommerce API does not support platform: ${store}`);
  }

  // QuickCommerce API requires lat/lon. Using static coords as this doesn't strictly alter fashion queries
  const lat = 28.6139;
  const lon = 77.2090;

  const url = `https://api.quickcommerceapi.com/v1/search?q=${encodeURIComponent(query)}&platform=${platformName}&lat=${lat}&lon=${lon}`;

  console.log(`[QUICKCOMMERCE] Fetching ${platformName} search for "${query}", page ${page}`);
  
  const res = await fetch(url, {
    headers: {
      'X-API-Key': key
    },
    timeout: 15000 // 15 seconds timeout
  });

  if (res.status === 429) throw new Error(`RATE_LIMIT: QuickCommerce API rate limited (429)`);
  if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: QuickCommerce API authentication failed (${res.status})`);
  if (!res.ok) throw new Error(`QuickCommerce API HTTP ${res.status}`);

  const data = await res.json() as any;
  
  if (!data.data || !Array.isArray(data.data.products)) {
    return [];
  }

  const limit = 20;
  const allProducts = data.data.products;
  
  // QuickCommerce doesn't natively paginate. Slice manually to support 20 + 20 + 20 UI behavior.
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const pagedProducts = allProducts.slice(startIndex, endIndex);

  return pagedProducts.map((item: any) => {
    // QuickCommerce gives images array, mrp, offer_price, deeplink, name, id
    return {
      id: item.id || `qc_${store}_${Date.now()}_${Math.random()}`,
      name: item.name || '',
      title: item.name || '',
      price: (item.offer_price || item.mrp || 0).toString(),
      originalPrice: item.mrp ? item.mrp.toString() : null,
      discount: item.offer_price && item.mrp ? Math.round(((item.mrp - item.offer_price) / item.mrp) * 100).toString() + "%" : null,
      imageUrl: item.images && item.images.length > 0 ? item.images[0] : "",
      image: item.images && item.images.length > 0 ? item.images[0] : "",
      description: "",
      rating: item.rating || 0,
      reviews: item.rating_count || 0,
      brand: item.brand || store,
      store: store,
      platform: store,
      gender: gender,
      productUrl: item.deeplink || `https://www.${store}.com/search?q=${encodeURIComponent(query)}`
    } as RealProduct;
  });
}
