import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase';
import {
  getAllUsers,
  updateUserPlan,
  banUser,
  giftPremium,
  getPlatformClicks,
  getRevenueStats,
  getAffiliateHistory,
  getAffiliateStats,
  createAffiliateClick,
  trackPlatformClick
} from '../services/firebaseService';
import { SubscriptionTier } from '../models/types';

const router = Router();

// Admin login is handled entirely by Firebase Auth on the client side.
// The client will obtain a Firebase ID token and send it in the Authorization header.

import { auth } from '../config/firebase';

import jwt from 'jsonwebtoken';
// Real Admin auth middleware using Firebase and JWT
export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized', message: 'No authorization header provided.' });
      return;
    }
    const token = authHeader.split(' ')[1];

    // 1. First try to verify it as our new secure .env JWT token
    const secret = process.env.JWT_SECRET || 'tryonx-super-secret-jwt-key-2026-xyz';
    try {
      const decodedJWT = jwt.verify(token, secret) as any;
      if (decodedJWT && decodedJWT.role === 'env_admin') {
        (req as any).adminUser = { email: decodedJWT.email, role: 'super_admin', uid: 'admin_dashboard' };
        next();
        return;
      }
    } catch (jwtError) {
      // Not a valid JWT, so we fall through and try Firebase below
    }

    // 2. Fall back to Firebase Token Verification
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token.' });
      return;
    }

    const email = decodedToken.email || '';
    const uid = decodedToken.uid;

    // Check if it's the master admin
    if (email === process.env.ADMIN_EMAIL || email === 'yashwanthrao2626@gmail.com') {
      (req as any).adminUser = { uid, email, role: 'super_admin' };
      next();
      return;
    }

    // Otherwise, check Firestore for 'admin' role
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(403).json({ error: 'forbidden', message: 'User record not found.' });
      return;
    }

    const userData = userDoc.data();
    if (userData?.role === 'admin' || userData?.role === 'super_admin') {
      (req as any).adminUser = { uid, email, role: userData.role };
      next();
      return;
    }

    res.status(403).json({ error: 'forbidden', message: 'Access denied. Administrator privileges required.' });
  } catch (error: any) {
    console.error('Admin Auth Middleware Error:', error);
    res.status(500).json({ error: 'server_error', message: 'Internal server error during authorization.' });
  }
};

// POST /activity: Protected. Creates an admin audit log
router.post('/activity', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUser = (req as any).adminUser;
    const { action, target, metadata } = req.body;
    
    if (!action || !target) {
      res.status(400).json({ error: 'bad_request', message: 'Missing action or target' });
      return;
    }

    const logRef = await db.collection('adminActivity').add({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action,
      target,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, id: logRef.id });
  } catch (error: any) {
    console.error('Admin activity log error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /orders: Protected. Returns list of all orders (payments)
router.get('/orders', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('payments').orderBy('timestamp', 'desc').limit(100).get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const totalRevenue = orders.reduce((sum: number, order: any) => {
      if (order.status === 'success') {
        return sum + Number(order.amount || 0);
      }
      return sum;
    }, 0);

    const successfulOrders = orders.filter((o: any) => o.status === 'success').length;

    res.json({
      success: true,
      totalOrders: orders.length,
      successfulOrders,
      totalRevenue,
      orders
    });
  } catch (error: any) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /dashboard: Protected. Returns dashboard statistics
router.get('/dashboard', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map((doc: any) => doc.data());
    
    const totalUsers = allUsers.length;
    let premiumUsers = 0;
    let freeUsers = 0;
    let studentCount = 0;
    let proCount = 0;
    let businessCount = 0;

    allUsers.forEach((u: any) => {
      const plan = u.plan || 'free';
      if (plan !== 'free') premiumUsers++;
      if (plan === 'free') freeUsers++;
      else if (plan === 'student') studentCount++;
      else if (plan === 'pro' || plan === 'premium') proCount++;
      else if (plan === 'business') businessCount++;
    });

    const tryOnsSnapshot = await db.collection('tryons').get();
    const tryOns = tryOnsSnapshot.docs.map((d: any) => d.data());
    const today = new Date().toISOString().split('T')[0];
    const todayTryOns = tryOns.filter((t: any) => t.timestamp && t.timestamp.startsWith(today)).length;

    // Ads logic
    const adRevenue = Math.floor(totalUsers * 0.5); 
    
    // Affiliate logic
    const affStats = await getAffiliateStats();
    
    // Revenue
    const subRevenue = await getRevenueStats() * 83; 
    
    // Recharts Data (Real daily revenue for 30 days based on payments)
    const dailyRevenueMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyRevenueMap[d.toISOString().split('T')[0].slice(5)] = 0;
    }

    const paymentsSnapshot = await db.collection('payments').where('timestamp', '>=', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()).get();
    paymentsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.amount && data.status === 'success') {
        const dateKey = data.timestamp.split('T')[0].slice(5);
        if (dailyRevenueMap[dateKey] !== undefined) {
          dailyRevenueMap[dateKey] += Number(data.amount);
        }
      }
    });

    const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({ date, revenue }));

    // Credits Used
    let totalCreditsUsed = 0;
    const generationsSnapshot = await db.collection('tryons').get(); 
    totalCreditsUsed = generationsSnapshot.size * 2; 

    res.json({
      totalUsers,
      premiumUsers,
      freeUsers,
      studentCount,
      proCount,
      businessCount,
      todayTryOns,
      totalTryOns: tryOns.length,
      adRevenue,
      affiliateRevenue: affStats.estimatedEarnings,
      subRevenue,
      dailyRevenue,
      totalCreditsUsed
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /virtual-try-on: Protected. Returns virtual try-on detailed analytics
router.get('/virtual-try-on', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('tryons').orderBy('timestamp', 'desc').limit(200).get();
    const tryons = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    let successCount = 0;
    let failedCount = 0;
    const modelUsage: Record<string, number> = {};
    const dailyCount: Record<string, number> = {};
    
    // Map last 7 days to 0
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyCount[d.toISOString().split('T')[0]] = 0;
    }

    tryons.forEach((t: any) => {
      if (t.status === 'failed') failedCount++;
      else successCount++;

      const model = t.model || 'Unknown';
      modelUsage[model] = (modelUsage[model] || 0) + 1;

      if (t.timestamp) {
        const dateStr = t.timestamp.split('T')[0];
        if (dailyCount[dateStr] !== undefined) {
          dailyCount[dateStr]++;
        }
      }
    });

    const timeline = Object.entries(dailyCount).map(([date, count]) => ({ date: date.slice(5), count }));
    const models = Object.entries(modelUsage).map(([name, count]) => ({ name, value: count }));

    res.json({
      total: tryons.length,
      successCount,
      failedCount,
      successRate: tryons.length > 0 ? ((successCount / tryons.length) * 100).toFixed(1) : 0,
      models,
      timeline,
      recentLogs: tryons.slice(0, 20)
    });
  } catch (error: any) {
    console.error('Admin virtual-try-on error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /users: Protected. Returns list of all user profiles
router.get('/users', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// POST /users/:uid/gift: Protected. Gifts a subscription plan
router.post('/users/:uid/gift', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { plan, durationDays } = req.body;

    if (!plan || durationDays === undefined) {
      res.status(400).json({ error: 'bad_request', message: 'Missing plan or durationDays.' });
      return;
    }

    const validTiers: SubscriptionTier[] = ['free', 'student', 'pro', 'business', 'enterprise'];
    if (!validTiers.includes(plan)) {
      res.status(400).json({ error: 'bad_request', message: `Invalid plan. Must be one of: ${validTiers.join(', ')}` });
      return;
    }

    await giftPremium(uid as string, plan as SubscriptionTier, Number(durationDays));
    
    // Log the gift in a special collection or user profile
    await db.collection('users').doc(uid as string).update({ giftedByAdmin: true, giftedDate: new Date().toISOString() });

    res.json({ success: true, message: `Gifted ${plan} subscription for ${durationDays} days.` });
  } catch (error: any) {
    console.error('Admin gift premium error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// POST /users/:uid/remove-premium: Protected. Downgrades user to 'free'
router.post('/users/:uid/remove-premium', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    await updateUserPlan(uid as string, 'free');
    res.json({ success: true, message: 'Premium subscription removed successfully.' });
  } catch (error: any) {
    console.error('Admin remove premium error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// POST /users/:uid/ban: Protected. Bans or unbans a user
router.post('/users/:uid/ban', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { isBanned } = req.body;

    if (isBanned === undefined) {
      res.status(400).json({ error: 'bad_request', message: 'Missing isBanned field in request body.' });
      return;
    }

    await banUser(uid as string, Boolean(isBanned));
    res.json({ success: true, message: `User status set to isBanned: ${isBanned}.` });
  } catch (error: any) {
    console.error('Admin ban user error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /affiliate-stats: Protected. Returns aggregated affiliate statistics globally
router.get('/affiliate-stats', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getAffiliateStats(); // no userId passed -> global
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Fetch global affiliate stats failed:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve stats.' });
  }
});

// GET /affiliate-history: Protected. Returns chronological affiliate clicks globally
router.get('/affiliate-history', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await getAffiliateHistory(); // global
    res.json({ success: true, history });
  } catch (error: any) {
    console.error('Fetch global affiliate history failed:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve history logs.' });
  }
});

// GET /affiliate-analytics: Protected. Enhanced analytics globally
router.get('/affiliate-analytics', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await getAffiliateHistory();
    
    // 1. Time-series: group by date
    const dailyMap: Record<string, { clicks: number; conversions: number; earnings: number }> = {};
    const now = new Date();
    // Pre-fill last 30 days with zeros
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { clicks: 0, conversions: 0, earnings: 0 };
    }

    // 2. Platform breakdown
    const platformBreakdown: Record<string, { clicks: number; conversions: number; earnings: number; products: string[] }> = {};
    
    // 3. Top products
    const productHits: Record<string, { name: string; store: string; price: string; clicks: number; conversions: number; earnings: number }> = {};
    
    // 4. Hourly heatmap (0-23)
    const hourlyHeatmap = Array.from({ length: 24 }, () => 0);

    let totalClicks = 0;
    let totalConversions = 0;
    let totalEarnings = 0;
    let weekClicks = 0;
    let weekEarnings = 0;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const click of history) {
      totalClicks++;
      const ts = new Date(click.timestamp);
      const dateKey = ts.toISOString().split('T')[0];
      const hour = ts.getHours();
      hourlyHeatmap[hour]++;

      // Daily fill
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].clicks++;
      }

      // Week stats
      if (ts >= sevenDaysAgo) {
        weekClicks++;
      }

      // Platform
      const store = (click.clothingStore || click.platform || 'amazon').toLowerCase();
      if (!platformBreakdown[store]) {
        platformBreakdown[store] = { clicks: 0, conversions: 0, earnings: 0, products: [] };
      }
      platformBreakdown[store].clicks++;

      // Product aggregation
      const productKey = `${click.clothingName}__${store}`;
      if (!productHits[productKey]) {
        productHits[productKey] = { name: click.clothingName, store, price: click.clothingPrice, clicks: 0, conversions: 0, earnings: 0 };
      }
      productHits[productKey].clicks++;

      if (click.isConverted) {
        totalConversions++;
        totalEarnings += click.estimatedCommission || 0;
        if (dailyMap[dateKey]) dailyMap[dateKey].conversions++;
        if (dailyMap[dateKey]) dailyMap[dateKey].earnings += click.estimatedCommission || 0;
        if (ts >= sevenDaysAgo) weekEarnings += click.estimatedCommission || 0;
        platformBreakdown[store].conversions++;
        platformBreakdown[store].earnings += click.estimatedCommission || 0;
        if (!platformBreakdown[store].products.includes(click.clothingName)) {
          platformBreakdown[store].products.push(click.clothingName);
        }
        productHits[productKey].conversions++;
        productHits[productKey].earnings += click.estimatedCommission || 0;
      }
    }

    // Sort timeseries
    const timeSeries = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // Top 10 products by clicks
    const topProducts = Object.values(productHits)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Monthly projection (based on last 7 day average)
    const avgDailyEarnings = weekClicks > 0 ? weekEarnings / 7 : 0;
    const monthlyProjection = parseFloat((avgDailyEarnings * 30).toFixed(2));
    const yearlyProjection = parseFloat((avgDailyEarnings * 365).toFixed(2));

    res.json({
      success: true,
      analytics: {
        summary: {
          totalClicks,
          totalConversions,
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          conversionRate: totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(1)) : 0,
          weekClicks,
          weekEarnings: parseFloat(weekEarnings.toFixed(2)),
          monthlyProjection,
          yearlyProjection,
          avgOrderValue: totalConversions > 0 ? parseFloat((totalEarnings / totalConversions).toFixed(2)) : 0
        },
        timeSeries,
        platformBreakdown,
        topProducts,
        hourlyHeatmap
      }
    });
  } catch (error: any) {
    console.error('Enhanced affiliate analytics failed:', error);
    res.status(500).json({ error: error.message || 'Failed to compute analytics.' });
  }
});

// POST /affiliate-click: Admin wrapper to test/compile affiliate links
router.post('/affiliate-click', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = 'admin_matrix';
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

    let parsedPrice = 500; 
    if (clothingPrice) {
      const cleaned = clothingPrice.replace(/[^0-9]/g, '');
      if (cleaned) {
        parsedPrice = parseInt(cleaned, 10);
      }
    }

    let commissionRate = 0.08; 
    if (store.includes('flipkart')) { commissionRate = 0.06; } 
    else if (store.includes('myntra')) { commissionRate = 0.10; } 
    else if (store.includes('ajio')) { commissionRate = 0.12; } 
    else if (store.includes('meesho')) { commissionRate = 0.05; }

    const estimatedCommission = parseFloat((parsedPrice * commissionRate).toFixed(2));
    const isConverted = Math.random() < 0.10; // simulate

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
    try { await trackPlatformClick(platform || clothingStore || 'amazon'); } catch (err) {}

    res.json({ success: true, clickId, affiliateUrl, isConverted, estimatedCommission });
  } catch (error: any) {
    console.error('Admin affiliate click error:', error);
    res.status(500).json({ error: error.message || 'Failed to process affiliate click.' });
  }
});

// GET /activity-feed: Protected. Returns recent activity logs
router.get('/activity-feed', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('activityLogs').orderBy('timestamp', 'desc').limit(20).get();
    const activities = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, activities });
  } catch (error: any) {
    console.error('Fetch activity feed failed:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve activity feed.' });
  }
});

// POST /users/:uid/grant-credits: Protected. Grants free credits to a user
router.post('/users/:uid/grant-credits', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { amount } = req.body;
    const creditsToAdd = Number(amount);

    if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Invalid credit amount.' });
      return;
    }

    const adminUser = (req as any).adminUser;

    await db.runTransaction(async (transaction: any) => {
      const walletRef = db.collection('wallets').doc(uid as string);
      const walletDoc = await transaction.get(walletRef);
      
      let newBalance = creditsToAdd;
      if (walletDoc.exists) {
        newBalance = (walletDoc.data()?.balance || 0) + creditsToAdd;
        transaction.update(walletRef, { 
          balance: newBalance,
          updatedAt: new Date().toISOString()
        });
      } else {
        transaction.set(walletRef, {
          userId: uid,
          balance: newBalance,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const ledgerRef = db.collection('credit_ledger').doc();
      transaction.set(ledgerRef, {
        id: ledgerRef.id,
        userId: uid,
        type: 'ADMIN_GRANT',
        amount: creditsToAdd,
        balanceAfter: newBalance,
        referenceType: 'MANUAL_GRANT',
        referenceId: `grant_${Date.now()}`,
        description: `Granted ${creditsToAdd} free credits by admin (${adminUser.email})`,
        createdAt: new Date().toISOString(),
      });
    });

    res.json({ success: true, message: `Successfully granted ${creditsToAdd} credits to user ${uid}.` });
  } catch (error: any) {
    console.error('Admin grant credits error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

export default router;
