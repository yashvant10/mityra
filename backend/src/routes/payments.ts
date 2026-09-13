import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { getUserProfile, updateUserProfile } from '../services/firebaseService';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

// ─── Plan configuration ───
const PLAN_CONFIG: Record<string, { price: number; credits: number; tier: string }> = {
  Starter: { price: 199, credits: 20, tier: 'student' },
  Premium: { price: 499, credits: 100, tier: 'pro' },
};

// GET /api/payments/plans — List available plans
router.get('/plans', async (_req, res: Response): Promise<void> => {
  res.json({
    plans: Object.entries(PLAN_CONFIG).map(([name, config]) => ({
      name,
      price: config.price,
      credits: config.credits,
      currency: 'INR',
    })),
  });
});

// POST /api/payments/create-order — Create a payment order (Razorpay only)
router.post('/create-order', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { planName } = req.body;

    if (!planName || !PLAN_CONFIG[planName]) {
      res.status(400).json({ error: `Invalid plan: ${planName}. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      return;
    }

    const plan = PLAN_CONFIG[planName];
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('[Payments] Missing Razorpay credentials.');
      res.status(500).json({ error: 'Payment gateway configuration is missing.' });
      return;
    }

    const instance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await instance.orders.create({
      amount: plan.price * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `ant_${userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId,
        planName,
        credits: plan.credits.toString(), // ensure string values for notes
      },
    });

    res.json({
      orderId: order.id,
      amount: plan.price,
      currency: 'INR',
      plan: planName,
      credits: plan.credits,
      razorpayKeyId,
      isMock: false,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify — Verify payment and add credits
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits: requestedCredits } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing payment details for verification' });
      return;
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      console.error('[Payments] Missing Razorpay credentials.');
      res.status(500).json({ error: 'Payment gateway configuration is missing.' });
      return;
    }

    // Verify Signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: 'Payment verification failed: invalid signature' });
      return;
    }

    // Prevent Duplicate Payments
    const { db } = require('../config/firebase');
    const paymentRef = db.collection('processed_payments').doc(razorpay_payment_id);
    const paymentDoc = await paymentRef.get();
    
    if (paymentDoc.exists) {
      res.status(400).json({ error: 'Payment already processed.' });
      return;
    }

    // Credits logic
    let creditsToAdd = 20; // default for Starter
    if (requestedCredits && typeof requestedCredits === 'number' && requestedCredits > 0) {
      creditsToAdd = requestedCredits;
    }

    // TODO: Ideally we should verify if this razorpay_payment_id has already been processed to prevent duplicates
    // But for this pre-deployment check we'll just update the user profile.
    const profile = await getUserProfile(userId);
    const currentCredits = (profile as any)?.credits ?? 0;
    const newCredits = currentCredits + creditsToAdd;

    await updateUserProfile(userId, {
      credits: newCredits,
    } as any);

    // Mark payment as processed
    await paymentRef.set({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      userId,
      creditsAdded: creditsToAdd,
      amount: 0, // amount can be passed from frontend if needed
      timestamp: new Date().toISOString()
    });

    console.log(`[Payments] Credits updated for ${userId}: ${currentCredits} → ${newCredits} (+${creditsToAdd})`);

    res.json({
      success: true,
      credits: newCredits,
      creditsAdded: creditsToAdd,
      message: `Successfully added ${creditsToAdd} credits to your account.`,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

export default router;
