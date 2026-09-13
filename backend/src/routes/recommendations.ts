import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { getRecommendations } from '../services/firebaseService';

const router = Router();

// GET /api/recommendations — Get personalized recommendations
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const recommendations = await getRecommendations(userId);

    // If no personalized recommendations exist, return trending defaults
    if (recommendations.length === 0) {
      res.json({
        recommendations: getDefaultRecommendations(),
        source: 'trending',
      });
      return;
    }

    res.json({ recommendations, source: 'personalized' });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

function getDefaultRecommendations() {
  return [
    {
      id: 'trend-1',
      type: 'style',
      title: 'Minimalist Elegance',
      description: 'Clean lines, neutral tones, and timeless pieces that speak volumes through simplicity.',
      imageUrl: '/images/recommendations/minimalist.jpg',
      tags: ['minimalist', 'neutral', 'elegant'],
      confidence: 0.95,
    },
    {
      id: 'trend-2',
      type: 'style',
      title: 'Urban Streetwear',
      description: 'Bold graphics, oversized silhouettes, and statement sneakers for the city explorer.',
      imageUrl: '/images/recommendations/streetwear.jpg',
      tags: ['streetwear', 'urban', 'bold'],
      confidence: 0.92,
    },
    {
      id: 'trend-3',
      type: 'color',
      title: 'Lavender Dreams',
      description: 'Soft purple hues dominating runways — from lilac blazers to mauve accessories.',
      imageUrl: '/images/recommendations/lavender.jpg',
      tags: ['purple', 'lavender', 'trending'],
      confidence: 0.88,
    },
    {
      id: 'trend-4',
      type: 'outfit',
      title: 'Power Business Casual',
      description: 'Elevated office wear that transitions seamlessly from boardroom to dinner.',
      imageUrl: '/images/recommendations/business.jpg',
      tags: ['business', 'casual', 'professional'],
      confidence: 0.90,
    },
    {
      id: 'trend-5',
      type: 'style',
      title: 'Athleisure Luxe',
      description: 'Premium sportswear meets everyday fashion — comfort without compromising style.',
      imageUrl: '/images/recommendations/athleisure.jpg',
      tags: ['athleisure', 'sporty', 'comfortable'],
      confidence: 0.87,
    },
    {
      id: 'trend-6',
      type: 'outfit',
      title: 'Date Night Sophisticate',
      description: 'Romantic, refined looks designed to make a lasting impression.',
      imageUrl: '/images/recommendations/datenight.jpg',
      tags: ['date', 'romantic', 'sophisticated'],
      confidence: 0.91,
    },
  ];
}

export default router;
