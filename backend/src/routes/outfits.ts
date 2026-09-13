import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { saveOutfit, getOutfits } from '../services/firebaseService';
import { Outfit } from '../models/types';

const router = Router();

// GET /api/outfits — Fetch all saved outfit combinations
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const outfits = await getOutfits(userId);
    res.json({ outfits });
  } catch (error) {
    console.error('Get outfits error:', error);
    res.status(500).json({ error: 'Failed to fetch outfits' });
  }
});

// POST /api/outfits — Save a new outfit combination
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { name, items, occasion, season, rating, isFavorite, imageUrl } = req.body;

    const outfit: Outfit = {
      id: '',
      userId,
      name: name || 'Custom Outfit Combo',
      items: items || [],
      occasion: occasion || 'Casual',
      season: season || 'All Season',
      rating: rating || 5,
      isFavorite: isFavorite || false,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
    };

    const id = await saveOutfit(outfit);
    res.status(201).json({ outfit: { ...outfit, id } });
  } catch (error) {
    console.error('Save outfit error:', error);
    res.status(500).json({ error: 'Failed to save outfit' });
  }
});

export default router;
