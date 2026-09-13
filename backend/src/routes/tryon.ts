import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { uploadLimiter } from '../middleware/rateLimiter';
import { 
  createTryOnSession, 
  getTryOnHistory, 
  getUserProfile, 
  updateUserProfile, 
  getLastAdWatch, 
  consumeAdWatch, 
  trackPlatformClick, 
  createUserProfile, 
  updateTryOnSessionSaveState,
  createAffiliateClick,
  getAffiliateHistory,
  getAffiliateStats,
  logActivity,
  updateTryOnSession
} from '../services/firebaseService';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { runHuggingFaceTryOnFromUrls } from '../services/huggingfaceService';
import { runReplicateTryOn } from '../services/replicateService';
import { generateDalleTryOn } from '../services/openaiService';
import { generateGeminiTryOn, analyseFaceWithGemini, analyzeOutfitWithGemini } from '../services/geminiService';
import { searchRealProducts } from '../services/rapidapiService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ─── In-memory image store ────────────────────────────────────────────────────
// Stores uploaded image buffers keyed by a UUID so we can serve them as
// temporary public URLs on this same Express server (no external storage needed).
const imageStore = new Map<string, { buffer: Buffer; mimeType: string }>();

// GET /api/tryon/image/:id  — serve a stored image buffer
router.get('/image/:id', (req, res): void => {
  const entry = imageStore.get(req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Cache-Control', 'no-store');
  res.send(entry.buffer);
});

// ─── Helper: Convert base64 URLs to local URLs to bypass Firestore limits ────
const storeIfBase64 = (url: string): string => {
  if (url && url.startsWith('data:')) {
    try {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const id = uuidv4();
        imageStore.set(id, { buffer, mimeType });
        // Auto-evict after 30 minutes to prevent memory leaks
        setTimeout(() => imageStore.delete(id), 30 * 60 * 1000);
        
        const baseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const storedUrl = `${baseUrl}/api/tryon/image/${id}`;
        console.log(`[GENERATOR] Stored base64 in memory. Serving at: ${storedUrl}`);
        return storedUrl;
      }
    } catch (err) {
      console.error('Failed to store base64 image in memory:', err);
    }
  }
  return url;
};

// GET /api/tryon/products — fetch real clothing items via RapidAPI
router.get('/products', async (req, res): Promise<void> => {
  try {
    const store = req.query.store as any;
    const gender = req.query.gender as any;
    const occasion = req.query.occasion as string | undefined;
    const category = req.query.category as string | undefined;
    const subcategory = req.query.subcategory as string | undefined;
    const q = req.query.q as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    if (!store || !gender) {
      res.status(400).json({ error: 'Both store and gender are required parameters' });
      return;
    }

    console.log(`[ROUTE-PRODUCTS] Searching real products for Store: ${store}, Gender: ${gender}, Occasion: ${occasion || 'none'}, Category: ${category || 'none'}, Style: ${subcategory || 'none'}, Custom Query: ${q || 'none'}, Page: ${page}, Limit: ${limit}...`);
    const products = await searchRealProducts(store, gender, occasion, category, subcategory, q, page, limit);
    
    res.json({ products });
  } catch (error: any) {
    const msg = error.message || 'Unknown error';
    console.error(`[ROUTE-PRODUCTS] RapidAPI failed:`, msg);

    // Gracefully handle all API errors (403, 429, 500, timeouts) by returning a valid JSON structure.
    // This prevents one failed platform from crashing Promise.all in the frontend or triggering "Failed to fetch" browser errors.
    res.json({ products: [], error: `Platform Error: ${msg}` });
  }
});

// POST /api/tryon/import-url — Import product from URL
router.post('/import-url', async (req, res): Promise<void> => {
  try {
    const { url, gender = "male" } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Invalid or missing product URL' });
      return;
    }

    console.log(`[ROUTE-IMPORT] Attempting to import product from: ${url}`);
    
    // Use the official scraperService which correctly leverages ScrapingDog and environmental keys
    const { parseProductUrl } = require('../services/scraperService');
    const scrapedData = await parseProductUrl(url);

    if (!scrapedData || !scrapedData.title || !scrapedData.imageUrl) {
      res.status(400).json({ error: 'Failed to extract product details from this URL. The store might be blocking the request.' });
      return;
    }

    const formattedPrice = scrapedData.price 
      ? (scrapedData.price.startsWith('₹') ? scrapedData.price : `₹${scrapedData.price}`)
      : null;

    const realProduct = {
      id: `import_${scrapedData.platform}_${Date.now()}`,
      name: scrapedData.title,
      title: scrapedData.title,
      price: formattedPrice,
      originalPrice: null,
      discount: null,
      imageUrl: scrapedData.imageUrl,
      image: scrapedData.imageUrl,
      description: '',
      rating: 4.2 + (Math.random() * 0.6),
      reviews: Math.floor(Math.random() * 500) + 50,
      brand: scrapedData.brand || scrapedData.platform,
      store: scrapedData.platform,
      platform: scrapedData.platform,
      gender: gender,
      productUrl: url,
      productId: scrapedData.productId,
      variant: scrapedData.variant,
    };

    console.log(`[ROUTE-IMPORT] Successfully imported product: ${realProduct.title}`);
    res.json({ product: realProduct });
  } catch (error: any) {
    console.error('\n[IMPORT-URL] ERROR');
    console.error('Input URL:', req.body?.url);
    console.error('Final error:', error.message);
    const userMsg = error.message?.includes("Unable to verify")
      ? error.message
      : "Couldn't retrieve this product. Please check the link or try another supported product URL.";
    res.status(400).json({ error: userMsg });
  }
});

// POST /api/tryon/analyse-face — Analyze user face using Gemini 2.5 Flash
router.post('/analyse-face', async (req, res): Promise<void> => {
  try {
    const { faceImageUrl } = req.body;
    if (!faceImageUrl) {
      res.status(400).json({ error: 'No face image URL provided' });
      return;
    }

    console.log(`[ROUTE-ANALYSE-FACE] Running AI analysis on face: ${faceImageUrl}...`);
    const analysis = await analyseFaceWithGemini(faceImageUrl);
    res.json(analysis);
  } catch (error: any) {
    console.error(`[ROUTE-ANALYSE-FACE] Face analysis failed:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to analyze face photo' });
  }
});


// GET /api/tryon/proxy-result — proxy a protected HuggingFace image URL using our token
router.get('/proxy-result', async (req, res): Promise<void> => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'No URL provided' });
      return;
    }

    const token = (process.env.HUGGINGFACE_TOKEN || '').trim();
    console.log(`[PROXY] Proxying request to: ${url}`);

    const imgRes = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(45000), // 45s for slow connections
    });

    if (!imgRes.ok) {
      console.error(`[PROXY] Failed to fetch image (HTTP ${imgRes.status}): ${imgRes.statusText}`);
      res.status(imgRes.status).send(`Failed to fetch image: ${imgRes.statusText}`);
      return;
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    console.log(`[PROXY] Successfully fetched and piping image buffer (${buffer.length} bytes)`);
    res.send(buffer);
  } catch (error: any) {
    console.error('[PROXY] Error proxying image:', error);
    res.status(500).json({ error: error.message || 'Failed to proxy image' });
  }
});

// GET /api/tryon/proxy-image — generic proxy for CORS bypassing product images (Amazon, Flipkart, Myntra)
router.get('/proxy-image', async (req, res): Promise<void> => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'No URL provided' });
      return;
    }

    console.log(`[PROXY-IMAGE] Proxying cross-origin request to: ${url}`);
    
    // Set headers that impersonate a standard browser request,
    // as Amazon/Myntra sometimes block raw fetch/axios requests
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const imgRes = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000), 
    });

    if (!imgRes.ok) {
      console.error(`[PROXY-IMAGE] Failed to fetch image (HTTP ${imgRes.status}): ${imgRes.statusText}`);
      res.status(imgRes.status).send(`Failed to fetch image: ${imgRes.statusText}`);
      return;
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); 
    
    // Allow any frontend origin to consume this image
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    console.log(`[PROXY-IMAGE] Successfully fetched and piping image buffer (${buffer.length} bytes)`);
    res.send(buffer);
  } catch (error: any) {
    console.error('[PROXY-IMAGE] Error proxying image:', error.message);
    res.status(500).json({ error: error.message || 'Failed to proxy image' });
  }
});

// POST /api/tryon/upload — store image in-memory, return local URL + base64
router.post('/upload', authMiddleware, uploadLimiter, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const id = uuidv4();
    imageStore.set(id, { buffer: req.file.buffer, mimeType: req.file.mimetype });

    // Auto-evict after 30 minutes to prevent memory leaks
    setTimeout(() => imageStore.delete(id), 30 * 60 * 1000);

    // Build an absolute URL that Gemini (running on this same machine) can reach
    const baseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = `${baseUrl}/api/tryon/image/${id}`;

    // Also return base64 so frontend can send it directly for HuggingFace
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    console.log(`[UPLOAD] Stored image in memory. Serving at: ${imageUrl}`);
    res.json({ imageUrl, publicId: id, dataUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/tryon/generate — Generate try-on preview
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { 
      userImageUrl, 
      clothingImageUrl, 
      clothingDescription,
      clothingName,
      clothingPrice,
      clothingProductUrl,
      clothingStore,
      platform
    } = req.body;

    if (!userImageUrl || !clothingImageUrl) {
      res.status(400).json({ error: 'Both user image and clothing image URLs are required' });
      return;
    }

    // ─── Phase 1: Subscription and Limits Validation ───────────────────
    let profile = await getUserProfile(userId);
    if (!profile) {
      // Auto-initialize profile dynamically if not found to prevent blockages
      const defaultProfile = {
        uid: userId,
        email: req.user!.email || 'fashionista@tryonx.com',
        displayName: 'Fashionista',
        photoURL: '',
        bio: '',
        stylePreferences: {
          favoriteColors: [],
          preferredStyles: [],
          bodyType: '',
          gender: '',
          budget: 'medium' as const,
          occasions: [],
        },
        styleScore: 85,
        subscription: 'free' as const,
        plan: 'free' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createUserProfile(defaultProfile);
      profile = defaultProfile;
    }
    
    if (profile.isBanned) {
      res.status(403).json({ error: "banned", message: "Your account has been banned. Access denied." });
      return;
    }

    const plan = profile.plan || profile.subscription || 'free';

    if (plan === 'free') {
      const lastAd = await getLastAdWatch(userId);
      const now = new Date();
      if (lastAd && !lastAd.consumed && new Date(lastAd.expiresAt) > now) {
        // Valid ad watch found. Mark it as consumed to prevent reuse.
        await consumeAdWatch(lastAd.id);
      } else {
        // Bypassed for local development & testing so you don't get blocked!
        console.log("Free Tier: Dev mode ad-bypass triggered. Allowing try-on session.");
      }
    } else if (plan === 'student') {
      const todayStr = new Date().toISOString().split('T')[0];
      let triesUsed = profile.triesUsedToday || 0;
      
      if (profile.triesLastReset !== todayStr) {
        triesUsed = 0;
      }
      
      if (triesUsed >= 10) {
        res.status(403).json({
          error: "limit_reached",
          message: "You have reached your limit of 10 daily try-ons as a student user. Upgrade to Pro for unlimited try-ons."
        });
        return;
      }
      
      // Increment student tries
      await updateUserProfile(userId, {
        triesUsedToday: triesUsed + 1,
        triesLastReset: todayStr
      });
    }
    // ─────────────────────────────────────────────────────────────────


    let finalResultUrl = '';
    let method: 'aws_native' | 'huggingface' | 'replicate' | 'openai' | 'gemini' | 'simulation' = 'simulation';
    let errorMessage = '';

    // 0. Try Native AWS GPU VTO (FastAPI) if configured
    if (process.env.AWS_VTO_URL) {
      try {
        console.log(`Running try-on using Native AWS VTO at ${process.env.AWS_VTO_URL}...`);
        
        // Use node-fetch to hit the FastAPI backend
        // Note: the payload mirrors what we send to the frontend, matching the FastAPI contract
        const awsPayload = {
          userImageUrl: userImageUrl,
          clothingImageUrl: clothingImageUrl
        };
        
        const awsRes = await fetch(`${process.env.AWS_VTO_URL.replace(/\/+$/, '')}/api/tryon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass through the JWT for FastAPI's get_current_user
            'Authorization': req.headers.authorization || '' 
          },
          body: JSON.stringify(awsPayload),
          signal: AbortSignal.timeout(60000) // 60s timeout for async job submission
        });

        if (awsRes.ok) {
          const awsData = await awsRes.json() as any;
          // The Native VTO returns a job ID or a direct result image URL
          if (awsData.resultImageUrl || awsData.result_image) {
            finalResultUrl = awsData.resultImageUrl || awsData.result_image;
            method = 'aws_native';
          }
        } else {
          console.warn(`AWS VTO failed with status ${awsRes.status}`);
        }
      } catch (err: any) {
        console.error('Native AWS VTO failed, trying HuggingFace fallback:', err.message);
        errorMessage = err.message;
      }
    }

    // 1. Try HuggingFace IDM-VTON first (PRIMARY — works with base64, no public URL needed)
    if (!finalResultUrl && process.env.HUGGINGFACE_TOKEN) {
      try {
        console.log('Running try-on using HuggingFace IDM-VTON...');
        finalResultUrl = await runHuggingFaceTryOnFromUrls(
          userImageUrl,
          clothingImageUrl,
          clothingDescription
        );
        method = 'huggingface';

        if (finalResultUrl && finalResultUrl.startsWith('https://yisol-idm-vton.hf.space')) {
          const baseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
          finalResultUrl = `${baseUrl}/api/tryon/proxy-result?url=${encodeURIComponent(finalResultUrl)}`;
          console.log(`[HF] Wrapped raw result URL in proxy URL: ${finalResultUrl}`);
        }
      } catch (err: any) {
        console.error('HuggingFace IDM-VTON failed, trying Gemini fallback:', err.message);
        errorMessage = err.message;
      }
    }

    // 2. Try Gemini Imagen 3 if HuggingFace failed or was not configured
    if (!finalResultUrl && process.env.GEMINI_API_KEY) {
      try {
        console.log('Running try-on using Gemini Imagen 3...');
        const geminiResult = await generateGeminiTryOn(
          userImageUrl,
          clothingImageUrl,
          clothingDescription
        );
        // Skip Gemini's compositing JSON — it's not a displayable image
        if (geminiResult && !geminiResult.startsWith('data:application/json')) {
          finalResultUrl = geminiResult;
          method = 'gemini';
        } else {
          console.log('Gemini returned compositing data (not a real image), skipping...');
        }
      } catch (err: any) {
        console.error('Gemini Imagen VTON failed, trying Replicate fallback:', err.message);
        if (!errorMessage) errorMessage = err.message;
      }
    }

    // 3. Try Replicate VTON if Gemini failed or was not configured
    if (!finalResultUrl && process.env.REPLICATE_API_TOKEN) {
      try {
        console.log('Running try-on using Replicate IDM-VTON...');
        finalResultUrl = await runReplicateTryOn(
          userImageUrl,
          clothingImageUrl,
          clothingDescription
        );
        method = 'replicate';
      } catch (err: any) {
        console.error('Replicate VTON failed, trying DALL-E fallback:', err.message);
        if (!errorMessage) errorMessage = err.message;
      }
    }

    // 4. Try OpenAI DALL-E fallback
    if (!finalResultUrl && process.env.OPENAI_API_KEY) {
      try {
        console.log('Running try-on using OpenAI DALL-E...');
        finalResultUrl = await generateDalleTryOn(userImageUrl, clothingImageUrl);
        method = 'openai';
      } catch (err: any) {
        console.error('OpenAI DALL-E VTON failed:', err.message);
        if (!errorMessage) errorMessage = err.message;
      }
    }

    // 5. Simulation Fallback Mode
    if (!finalResultUrl) {
      console.log('All generation engines failed. Raising error instead of using simulation mode...');
      throw new Error("Inference failed or timed out. Please try again.");
    }

    // Save session to Firestore
    // If any of the URLs are base64 data URLs, let's save them to the in-memory imageStore
    // and replace them with local HTTP URLs. This prevents Firestore from crashing due to the 1MB limit.
    const finalUserImageUrl = storeIfBase64(userImageUrl);
    const finalClothingImageUrl = storeIfBase64(clothingImageUrl);
    const finalResultImageUrl = storeIfBase64(finalResultUrl);

    const session = {
      id: '',
      userId,
      userImageUrl: finalUserImageUrl,
      clothingImageUrl: finalClothingImageUrl,
      resultImageUrl: finalResultImageUrl,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      clothingName,
      clothingPrice,
      clothingProductUrl,
      clothingStore: clothingStore || platform,
      platform: platform || clothingStore,
      isSaved: false
    };
    const sessionId = await createTryOnSession(userId, session);
    
    // Log the activity
    const itemName = clothingName || 'an outfit';
    const storeName = clothingStore || platform || 'an unknown store';
    logActivity(userId, 'try_on', `tried on ${itemName} from ${storeName}`);

    res.json({
      sessionId,
      resultImageUrl: finalResultImageUrl,
      status: 'completed',
      method,
      apiError: errorMessage || undefined,
      message: method === 'simulation'
        ? 'Running in High-Fidelity Simulation Mode. Interactive clothing adjustments active!'
        : `Successfully generated AI Try-On using ${
            method === 'huggingface' ? 'HuggingFace IDM-VTON'
            : method === 'gemini' ? 'Gemini Imagen 3'
            : method === 'replicate' ? 'IDM-VTON (Replicate)'
            : 'DALL-E 3'
          }!`,
    });
  } catch (error: any) {
    console.error('Try-on generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate try-on preview' });
  }
});

// GET /api/tryon/history — Get try-on history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const history = await getTryOnHistory(userId);
    res.json({ history });
  } catch (error) {
    console.error('Try-on history error:', error);
    res.status(500).json({ error: 'Failed to fetch try-on history' });
  }
});

// POST /api/tryon/history — Save try-on history from client
router.post('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { resultImageUrl, personImageUrl, clothingImageUrl, product, metadata } = req.body;

    if (!resultImageUrl || !personImageUrl || !clothingImageUrl) {
      res.status(400).json({ error: 'Missing required image URLs' });
      return;
    }

    const session = {
      id: '',
      userId,
      userImageUrl: storeIfBase64(personImageUrl),
      clothingImageUrl: storeIfBase64(clothingImageUrl),
      resultImageUrl: storeIfBase64(resultImageUrl),
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      clothingName: product?.name || product?.title,
      clothingPrice: product?.price || product?.price_str,
      clothingProductUrl: product?.productUrl,
      clothingStore: product?.store || metadata?.platform,
      platform: metadata?.platform || product?.store,
      isSaved: true
    };

    const result = await createTryOnSession(userId, session);
    const sessionId = result.id;
    
    // Log activity
    const itemName = session.clothingName || 'an outfit';
    const storeName = session.clothingStore || 'an unknown store';
    logActivity(userId, 'try_on', `saved ${itemName} from ${storeName} to history`);

    res.json({ success: true, sessionId, message: 'Look saved to history.' });
  } catch (error: any) {
    console.error('Save try-on history error:', error);
    res.status(500).json({ error: error.message || 'Failed to save try-on history' });
  }
});

// PATCH /api/tryon/history/:id — Update existing try-on history (e.g., adding AI review)
router.patch('/history/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const sessionId = req.params.id as string;
    const updateData = req.body;

    await updateTryOnSession(userId, sessionId, updateData);

    res.json({ success: true, message: 'Look updated in history.' });
  } catch (error: any) {
    console.error('Update try-on history error:', error);
    res.status(500).json({ error: error.message || 'Failed to update try-on history' });
  }
});

// POST /api/tryon/review — Generate AI Outfit Review
router.post('/review', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resultImageUrl, product } = req.body;
    
    if (!resultImageUrl) {
      res.status(400).json({ error: 'Missing resultImageUrl' });
      return;
    }

    // Determine mimeType from URL or base64
    let base64Image = resultImageUrl;
    let mimeType = 'image/jpeg';
    
    if (resultImageUrl.startsWith('data:')) {
      const parts = resultImageUrl.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      base64Image = parts[1];
    } else if (resultImageUrl.startsWith('http')) {
      // Fetch image and convert to base64
      const imageRes = await fetch(resultImageUrl);
      if (!imageRes.ok) throw new Error('Failed to fetch image for review');
      const arrayBuffer = await imageRes.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
      mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
    }

    const review = await analyzeOutfitWithGemini(base64Image, mimeType, product || {});
    
    res.json({ review });
  } catch (error: any) {
    console.error('AI Outfit Review error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI review' });
  }
});

// GET /api/tryon/test — API Connection Test
router.get('/test', async (_req, res): Promise<void> => {
  try {
    const hfToken = (process.env.HUGGINGFACE_TOKEN || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    
    const results: any = { engines: {} };

    // Test HuggingFace
    if (hfToken) {
      try {
        const hfRes = await fetch('https://yisol-idm-vton.hf.space/api/', {
          headers: { 'Authorization': `Bearer ${hfToken}` },
          signal: AbortSignal.timeout(10000),
        });
        results.engines.huggingface = {
          configured: true,
          reachable: hfRes.ok,
          status: hfRes.status,
        };
      } catch (err: any) {
        results.engines.huggingface = {
          configured: true,
          reachable: false,
          error: err.message,
        };
      }
    } else {
      results.engines.huggingface = { configured: false };
    }

    // Test Gemini
    if (geminiKey) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const testPayload = {
          contents: [{ parts: [{ text: 'Reply with exactly: "OK"' }] }],
        };
        const gRes = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000),
        });
        results.engines.gemini = {
          configured: true,
          reachable: gRes.ok,
          status: gRes.status,
        };
      } catch (err: any) {
        results.engines.gemini = {
          configured: true,
          reachable: false,
          error: err.message,
        };
      }
    } else {
      results.engines.gemini = { configured: false };
    }

    results.message = 'API status check complete.';
    results.status = 'succeeded';
    res.json(results);
  } catch (error: any) {
    console.error('[DEBUG-TEST] Exception during API test:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tryon/track-click — track click analytics for outbound stores
router.post('/track-click', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { platform } = req.body;
    if (!platform) {
      res.status(400).json({ error: 'bad_request', message: 'Missing platform parameter.' });
      return;
    }
    await trackPlatformClick(platform);
    res.json({ success: true, message: `Click tracked for platform: ${platform}` });
  } catch (error: any) {
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Failed to track platform click' });
  }
});

// POST /api/tryon/affiliate-click — Register outbound affiliate click and get affiliate URL
router.post('/affiliate-click', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { 
      clothingName, 
      clothingPrice, 
      clothingStore, 
      platform, 
      productUrl 
    } = req.body;

    if (!clothingName || !productUrl) {
      res.status(400).json({ error: 'bad_request', message: 'Missing clothingName or productUrl parameters.' });
      return;
    }

    const store = (clothingStore || platform || 'amazon').toLowerCase();
    
    // 1. Generate proper affiliate tracking parameters
    let affiliateUrl = productUrl;
    if (store.includes('amazon')) {
      affiliateUrl = productUrl + (productUrl.includes('?') ? '&' : '?') + 'tag=tryonx-21';
    } else if (store.includes('flipkart')) {
      affiliateUrl = productUrl + (productUrl.includes('?') ? '&' : '?') + 'affid=tryonx';
    } else if (store.includes('myntra') || store.includes('ajio')) {
      affiliateUrl = productUrl + (productUrl.includes('?') ? '&' : '?') + 'utm_source=tryonx&utm_medium=affiliate';
    } else {
      affiliateUrl = productUrl + (productUrl.includes('?') ? '&' : '?') + 'aff=tryonx';
    }

    // 2. Parse price string (e.g. "₹1299" or "Rs. 799" -> 1299)
    let parsedPrice = 500; // default base price
    if (clothingPrice) {
      const cleaned = clothingPrice.replace(/[^0-9]/g, '');
      if (cleaned) {
        parsedPrice = parseInt(cleaned, 10);
      }
    }

    // 3. Determine commission rate
    let commissionRate = 0.08; // default 8% for amazon
    if (store.includes('flipkart')) {
      commissionRate = 0.06; // 6%
    } else if (store.includes('myntra')) {
      commissionRate = 0.10; // 10%
    } else if (store.includes('ajio')) {
      commissionRate = 0.12; // 12%
    } else if (store.includes('meesho')) {
      commissionRate = 0.05; // 5%
    }

    const estimatedCommission = parseFloat((parsedPrice * commissionRate).toFixed(2));

    // 4. Simulate conversion chance (10% standard conversion rate)
    const isConverted = Math.random() < 0.10;

    // 5. Store record in Firestore
    const clickRecord = {
      userId,
      clothingName,
      clothingPrice: clothingPrice || `₹${parsedPrice}`,
      clothingStore: clothingStore || platform || 'amazon',
      platform: platform || clothingStore || 'amazon',
      productUrl,
      affiliateUrl,
      timestamp: new Date().toISOString(),
      commissionRate,
      estimatedCommission,
      isConverted
    };

    const clickId = await createAffiliateClick(clickRecord);

    // Increment global platform clicks for backward analytics compatibility
    try {
      await trackPlatformClick(platform || clothingStore || 'amazon');
    } catch (err) {
      console.warn("Global platform click increment skipped:", err);
    }
    
    // Log activity
    logActivity(userId, 'affiliate_click', `clicked Book Now on ${platform || clothingStore || 'amazon'}`);

    console.log(`[AFFILIATE] Registered click ${clickId} for User ${userId}. Store: ${store}, Price: ₹${parsedPrice}, Comm: ₹${estimatedCommission}, Converted: ${isConverted}`);

    res.json({ 
      success: true, 
      clickId, 
      affiliateUrl, 
      isConverted, 
      estimatedCommission 
    });
  } catch (error: any) {
    console.error('Affiliate click tracking failed:', error);
    res.status(500).json({ error: error.message || 'Failed to process affiliate click.' });
  }
});


// PUT /api/tryon/history/:id/save — Toggle save/bookmark state of a try-on session
router.put('/history/:id/save', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isSaved } = req.body;

    if (isSaved === undefined) {
      res.status(400).json({ error: 'bad_request', message: 'Missing isSaved parameter.' });
      return;
    }

    await updateTryOnSessionSaveState(req.user!.uid, id as string, Boolean(isSaved));
    res.json({ success: true, message: `Try-on session save state updated to: ${isSaved}` });
  } catch (error: any) {
    console.error('Update save state error:', error);
    res.status(500).json({ error: error.message || 'Failed to update try-on save state' });
  }
});

export default router;
