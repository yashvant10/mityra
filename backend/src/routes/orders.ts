import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { getOrders } from '../services/firebaseService';

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get user's fashion orders
 * @access  Private
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: missing user ID' });
      return;
    }
    const orders = await getOrders(userId);
    res.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

export default router;
