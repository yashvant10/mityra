import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { getUserProfile, updateUserProfile, createUserProfile, updateUserPlan, getLastAdWatch, recordAdWatch, logActivity, getCreditHistory } from '../services/firebaseService';
import { UserProfile, SubscriptionTier } from '../models/types';

const router = Router();

// POST /api/users/profile — Create user profile
router.post('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { displayName, email, photoURL } = req.body;

    const existing = await getUserProfile(userId);
    if (existing) {
      res.json({ profile: existing });
      return;
    }

    const profile: UserProfile = {
      uid: userId,
      email: email || req.user!.email,
      displayName: displayName || '',
      photoURL: photoURL || '',
      bio: '',
      stylePreferences: {
        favoriteColors: [],
        preferredStyles: [],
        bodyType: '',
        gender: '',
        budget: 'medium',
        occasions: [],
      },
      styleScore: 0,
      subscription: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createUserProfile(profile);
    res.status(201).json({ profile });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// GET /api/users/profile — Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const email = req.user!.email;

    const isEnvAdmin = email === process.env.ADMIN_EMAIL || email === 'yashwanthrao2626@gmail.com';

    let profile = await getUserProfile(userId);

    if (!profile) {
      if (isEnvAdmin) {
        res.json({ profile: { uid: userId, email, role: 'super_admin', displayName: 'Super Admin' } });
        return;
      }
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (isEnvAdmin) {
      profile.role = 'super_admin';
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile — Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.uid;
    delete updates.email;
    delete updates.subscription;

    await updateUserProfile(userId, updates);
    const updatedProfile = await getUserProfile(userId);

    res.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/upgrade — Upgrade user plan
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { plan } = req.body;

    const validPlans: SubscriptionTier[] = ['free', 'student', 'pro', 'business', 'enterprise'];
    if (!validPlans || !validPlans.includes(plan)) {
      res.status(400).json({ error: 'Invalid subscription plan' });
      return;
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await updateUserPlan(userId, plan, expiresAt);
    
    logActivity(userId, 'upgrade', `upgraded to ${plan} plan`);

    const profile = await getUserProfile(userId);
    res.json({ message: 'Plan upgraded successfully', profile });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});
// GET /api/users/plan — Get user subscription and ad status
router.get('/plan', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    
    const plan = profile.plan || profile.subscription || 'free';
    
    let maxTries = 0;
    let triesUsedToday = 0;
    
    if (plan === 'student') {
      maxTries = 10;
      const todayStr = new Date().toISOString().split('T')[0];
      if (profile.triesLastReset !== todayStr) {
        triesUsedToday = 0;
        await updateUserProfile(userId, { triesUsedToday: 0, triesLastReset: todayStr });
      } else {
        triesUsedToday = profile.triesUsedToday || 0;
      }
    } else if (['pro', 'business', 'enterprise'].includes(plan)) {
      maxTries = 99999;
      triesUsedToday = profile.triesUsedToday || 0;
    } else {
      // free plan
      const lastAd = await getLastAdWatch(userId);
      const hasUnconsumedAd = lastAd && !lastAd.consumed && (new Date(lastAd.expiresAt) > new Date());
      maxTries = hasUnconsumedAd ? 1 : 0;
      triesUsedToday = hasUnconsumedAd ? 0 : 0;
    }
    
    const lastAd = await getLastAdWatch(userId);
    let canWatch = true;
    let nextAvailableDate = '';
    if (lastAd) {
      const watchedAt = new Date(lastAd.watchedAt);
      const cooldownTime = watchedAt.getTime() + 7 * 24 * 60 * 60 * 1000;
      if (Date.now() < cooldownTime) {
        canWatch = false;
        nextAvailableDate = new Date(cooldownTime).toISOString();
      }
    }
    
    // Fetch real credit history
    const history = await getCreditHistory(userId);
    
    res.json({
      plan,
      triesUsedToday,
      maxTries,
      credits: profile.credits || 0,
      creditsUsed: profile.creditsUsed || 0,
      history,
      adStatus: {
        canWatch,
        nextAvailableDate
      }
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

// POST /api/users/watch-ad — Unlock a try-on credit via ad watch
router.post('/watch-ad', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const lastAd = await getLastAdWatch(userId);
    
    if (lastAd) {
      const watchedAt = new Date(lastAd.watchedAt);
      const cooldownTime = watchedAt.getTime() + 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now < cooldownTime) {
        const nextAvailableDate = new Date(cooldownTime).toISOString();
        res.status(400).json({
          error: 'ad_cooldown',
          message: `You can watch another ad on ${new Date(cooldownTime).toLocaleString()}.`,
          nextAvailableDate
        });
        return;
      }
    }
    
    const record = await recordAdWatch(userId);
    
    logActivity(userId, 'watch_ad', 'watched an ad for a free try-on');

    res.json({
      success: true,
      triesUnlocked: 1,
      nextAvailableDate: record.expiresAt,
    });
  } catch (error) {
    console.error('Watch ad error:', error);
    res.status(500).json({ error: 'Failed to record ad watch' });
  }
});

export default router;
