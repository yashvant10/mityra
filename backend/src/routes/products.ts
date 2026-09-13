import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { generalLimiter } from '../middleware/rateLimiter';
import { parseProductUrl } from '../services/scraperService';

const router = Router();

// POST /api/products/parse — Parse a product URL
router.post('/parse', authMiddleware, generalLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const productData = await parseProductUrl(url);
    
    res.json({
      success: true,
      product: productData,
    });
  } catch (error: any) {
    console.error('URL parsing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to parse product URL' 
    });
  }
});

export default router;
