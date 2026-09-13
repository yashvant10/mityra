import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { uploadLimiter } from '../middleware/rateLimiter';
import { uploadImageBuffer } from '../services/cloudinaryService';
import { addWardrobeItem, getWardrobeItems, updateWardrobeItem, deleteWardrobeItem } from '../services/firebaseService';
import { analyzeClothingImage } from '../services/geminiService';
import { WardrobeItem } from '../models/types';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/wardrobe — Get all wardrobe items
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const items = await getWardrobeItems(userId);
    res.json({ items });
  } catch (error) {
    console.error('Get wardrobe error:', error);
    res.status(500).json({ error: 'Failed to fetch wardrobe' });
  }
});

// POST /api/wardrobe — Add item to wardrobe
router.post('/', authMiddleware, uploadLimiter, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { category, subcategory, color, brand, tags } = req.body;

    let imageUrl = req.body.imageUrl || '';

    if (req.file) {
      const result = await uploadImageBuffer(req.file.buffer, 'wardrobe');
      imageUrl = result.url;
    }

    if (!imageUrl) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }

    const item: WardrobeItem = {
      id: '',
      userId,
      imageUrl,
      category: category || 'tops',
      subcategory: subcategory || '',
      color: color || '',
      brand: brand || '',
      tags: tags ? JSON.parse(tags) : [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    const id = await addWardrobeItem(userId, item);
    res.status(201).json({ item: { ...item, id } });
  } catch (error) {
    console.error('Add wardrobe item error:', error);
    res.status(500).json({ error: 'Failed to add wardrobe item' });
  }
});

// POST /api/wardrobe/scan — Analyze clothing image and return category
router.post('/scan', authMiddleware, uploadLimiter, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Image is required for scanning' });
      return;
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    
    const analysis = await analyzeClothingImage(base64Image, mimeType);
    
    res.json({ analysis });
  } catch (error) {
    console.error('Scan clothing error:', error);
    res.status(500).json({ error: 'Failed to analyze clothing image' });
  }
});

// PUT /api/wardrobe/:id — Update wardrobe item
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.userId;
    delete updates.id;

    await updateWardrobeItem(req.user!.uid, id as string, updates);
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update wardrobe item error:', error);
    res.status(500).json({ error: 'Failed to update wardrobe item' });
  }
});

// DELETE /api/wardrobe/:id — Delete wardrobe item
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteWardrobeItem(req.user!.uid, id as string);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete wardrobe item error:', error);
    res.status(500).json({ error: 'Failed to delete wardrobe item' });
  }
});

export default router;
