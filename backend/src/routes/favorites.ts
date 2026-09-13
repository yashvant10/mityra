import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { addFavoriteProduct, removeFavoriteProduct, getUserFavorites, getFavoriteByProductId } from '../services/firebaseService';
import { FavoriteProduct } from '../models/types';

const router = Router();

// GET /api/favorites — Get all favorites for the authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const favorites = await getUserFavorites(userId);
    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites — Add a product to favorites
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { productId, name, brand, price, originalPrice, discount, imageUrl, store, productUrl, category, size } = req.body;

    if (!productId || !name || !imageUrl) {
      res.status(400).json({ error: 'Missing required fields: productId, name, imageUrl' });
      return;
    }

    // Check for duplicate (make it idempotent)
    const existing = await getFavoriteByProductId(userId, productId);
    if (existing) {
      res.status(200).json({ favorite: existing });
      return;
    }

    const item: FavoriteProduct = {
      id: '',
      userId,
      productId,
      name: name || '',
      brand: brand || null,
      price: price || null,
      originalPrice: originalPrice || null,
      discount: discount || null,
      imageUrl,
      store: store || 'unknown',
      productUrl: productUrl || '',
      category: category || 'other',
      size: size || null,
      createdAt: new Date().toISOString(),
    };

    const id = await addFavoriteProduct(userId, item);
    res.status(201).json({ favorite: { ...item, id } });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/favorites/:id — Remove a favorite by Firestore doc ID
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await removeFavoriteProduct(req.user!.uid, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// GET /api/favorites/check/:productId — Check if a product is already favorited
router.get('/check/:productId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const productId = req.params.productId as string;
    const existing = await getFavoriteByProductId(userId, productId);
    res.json({ isFavorited: !!existing, favoriteId: existing?.id || null });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

export default router;
