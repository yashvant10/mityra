import axios from 'axios';
import * as cheerio from 'cheerio';
import { RealProduct } from './rapidapiService';

/**
 * Common browser headers to bypass simple bot protection
 */
const getBrowserHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
});

/**
 * Scrapes Flipkart search results using native Axios and Cheerio.
 */
export async function scrapeFlipkartSearch(query: string, gender: "male" | "female", page: number = 1): Promise<RealProduct[]> {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&page=${page}`;
  console.log(`[NATIVE_SCRAPER] Fetching Flipkart search: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: getBrowserHeaders(),
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const products: RealProduct[] = [];

    // Flipkart's product cards usually have a 'data-id' attribute
    $('div[data-id]').each((idx, el) => {
      const $el = $(el);

      // Extract titles (different view grids have different classes)
      const title = $el.find('a.WKTcLC').text().trim() || 
                    $el.find('a.IRpwTa').text().trim() || 
                    $el.find('.s1Q9rs').text().trim();
      
      // Extract brand (usually displayed above or below the title)
      const brand = $el.find('.syl9yP').text().trim() || 
                    $el.find('._2WkVRV').text().trim() || 
                    null;

      // Extract prices
      const priceText = $el.find('div.Nx9bqj').text().trim() || 
                        $el.find('div._30jeq3').text().trim();
      
      const originalPriceText = $el.find('div.yRaY8j').text().trim() || 
                                $el.find('div._3I9_wc').text().trim();
      
      const discountText = $el.find('div.UkUFwK span').text().trim() || 
                           $el.find('div._3Ay6Sb span').text().trim();

      // Extract product URL
      const link = $el.find('a').attr('href');
      
      // Extract image URL
      const img = $el.find('img').attr('src');

      if (title && priceText && link && img) {
        // Ensure absolute URL
        const productUrl = link.startsWith('http') ? link : `https://www.flipkart.com${link}`;

        // Format prices properly
        const price = priceText ? priceText.replace(/[^\d.₹]/g, '') : null;
        const originalPrice = originalPriceText ? originalPriceText.replace(/[^\d.₹]/g, '') : null;
        
        products.push({
          id: `native_flipkart_${$el.attr('data-id') || Date.now()}_${idx}`,
          name: title,
          title: title,
          price: price,
          originalPrice: originalPrice || null,
          discount: discountText || null,
          imageUrl: img,
          image: img,
          description: title,
          rating: null, // Hard to extract reliably without clicking into PDP
          reviews: null,
          brand: brand,
          store: 'flipkart',
          platform: 'flipkart',
          gender: gender,
          productUrl: productUrl,
        });
      }
    });

    if (products.length === 0) {
      console.log(`[NATIVE_SCRAPER] Debug: Flipkart returned 0 products. HTML preview: ${response.data.substring(0, 300)}`);
    }

    console.log(`[NATIVE_SCRAPER] Successfully scraped ${products.length} real products from Flipkart.`);
    return products;

  } catch (error: any) {
    console.error(`[NATIVE_SCRAPER] Flipkart scraping failed: ${error.message}`);
    throw new Error(`Native Scraper Flipkart failed: ${error.message}`);
  }
}

/**
 * Scrapes Myntra search results using native Axios and Cheerio.
 * Myntra injects state inside a window.__myx script.
 */
export async function scrapeMyntraSearch(query: string, gender: "male" | "female", page: number = 1): Promise<RealProduct[]> {
  const url = `https://www.myntra.com/${encodeURIComponent(query.replace(/\s+/g, '-'))}?rawQuery=${encodeURIComponent(query)}&p=${page}`;
  console.log(`[NATIVE_SCRAPER] Fetching Myntra search: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: getBrowserHeaders(),
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    let scriptContent = '';
    
    $('script').each((i, el) => {
      const html = $(el).html();
      if (html && html.includes('searchData')) {
        scriptContent = html;
        return false; // Break out of each loop
      }
    });

    if (!scriptContent) {
      throw new Error('No searchData script found on Myntra page.');
    }

    const startIdx = scriptContent.indexOf('window.__myx = ');
    if (startIdx === -1) {
      throw new Error('window.__myx object not found in script.');
    }

    let jsonStr = scriptContent.substring(startIdx + 15).trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

    const data = JSON.parse(jsonStr);
    const searchResults = data.searchData?.results?.products || [];

    const products = searchResults.map((item: any, idx: number): RealProduct | null => {
      const name = item.productName || item.product;
      if (!name) return null; 

      let imageUrl = item.searchImage;
      if (!imageUrl && Array.isArray(item.images) && item.images.length > 0) {
        imageUrl = item.images[0].src || item.images[0];
      }
      if (!imageUrl) return null; 

      const priceVal = item.price || item.mrp || 0;
      const originalPriceVal = item.mrp || item.price || 0;
      
      const price = priceVal ? priceVal.toString() : null;
      const originalPrice = originalPriceVal && originalPriceVal !== priceVal ? originalPriceVal.toString() : null;
      
      let discount = item.discountLabel || item.discountDisplayLabel || null;
      if (!discount && item.discount > 0) {
        discount = `${item.discount}% OFF`;
      }

      let productUrl = item.landingPageUrl || item.productUrl;
      if (productUrl && !productUrl.startsWith('http')) {
        productUrl = `https://www.myntra.com/${productUrl.replace(/^\/+/, '')}`;
      } else if (!productUrl) {
        productUrl = `https://www.myntra.com/${encodeURIComponent(name.replace(/\s+/g, '-'))}`;
      }

      const rating = typeof item.rating === 'number' && !isNaN(item.rating) ? Number(item.rating.toFixed(1)) : null;
      const reviews = typeof item.ratingCount === 'number' ? item.ratingCount : null;

      return {
        id: `native_myntra_${item.productId || Date.now()}_${idx}`,
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
        gender: gender,
        productUrl
      };
    }).filter((p: RealProduct | null): p is RealProduct => p !== null);

    console.log(`[NATIVE_SCRAPER] Successfully scraped ${products.length} real products from Myntra.`);
    return products;

  } catch (error: any) {
    console.error(`[NATIVE_SCRAPER] Myntra scraping failed: ${error.message}`);
    throw new Error(`Native Scraper Myntra failed: ${error.message}`);
  }
}
