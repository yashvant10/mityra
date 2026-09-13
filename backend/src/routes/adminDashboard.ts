import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebase';
import { envAdminAuthMiddleware } from '../middleware/envAdminAuth';

const router = Router();

// POST /login: Authenticates admin via .env credentials
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envPassword) {
      console.error('Admin password not configured in .env');
      res.status(500).json({ error: 'Server misconfiguration', message: 'Admin credentials not configured.' });
      return;
    }

    const isEnvAdmin = email === process.env.ADMIN_EMAIL || email === 'yashwanthrao2626@gmail.com';

    if (isEnvAdmin && password === envPassword) {
      const secret = process.env.JWT_SECRET || 'tryonx-super-secret-jwt-key-2026-xyz';
      const token = jwt.sign({ email, role: 'env_admin' }, secret, { expiresIn: '12h' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials.' });
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /users/search: Protected. Search users by Email or UID
router.get('/users/search', envAdminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'bad_request', message: 'Missing search query.' });
      return;
    }

    const searchQuery = q.trim();
    let users: any[] = [];

    // Try exact UID match first
    try {
      const doc = await db.collection('users').doc(searchQuery).get();
      if (doc.exists) {
        users.push({ uid: doc.id, ...doc.data() });
      }
    } catch (e) {
      // ignore
    }

    // Try email match if UID not found
    if (users.length === 0) {
      const snapshot = await db.collection('users').where('email', '==', searchQuery).get();
      snapshot.forEach(doc => {
        users.push({ uid: doc.id, ...doc.data() });
      });
    }

    // If still no users, maybe try partial match on email if it's small enough dataset
    // (Firebase doesn't support substring search natively easily, so we just do exact email or UID for security/speed)

    // Append wallet balances
    for (let i = 0; i < users.length; i++) {
      const walletDoc = await db.collection('wallets').doc(users[i].uid).get();
      users[i].credits = walletDoc.exists ? (walletDoc.data()?.balance || 0) : 0;
    }

    res.json({ success: true, users });
  } catch (error: any) {
    console.error('Admin search users error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// POST /users/:uid/gift-credits: Protected. Gifts credits to user and audits
router.post('/users/:uid/gift-credits', envAdminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { amount } = req.body;
    const creditsToAdd = Number(amount);
    const adminUser = (req as any).adminUser;

    if (isNaN(creditsToAdd) || creditsToAdd <= 0 || !Number.isInteger(creditsToAdd)) {
      res.status(400).json({ error: 'bad_request', message: 'Credit amount must be a positive integer.' });
      return;
    }

    await db.runTransaction(async (transaction: any) => {
      // 1. Get User info
      const userRef = db.collection('users').doc(uid as string);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const targetUserEmail = userDoc.data()?.email || 'Unknown';

      // 2. Get and update Wallet
      const walletRef = db.collection('wallets').doc(uid as string);
      const walletDoc = await transaction.get(walletRef);
      
      let previousBalance = 0;
      let newBalance = creditsToAdd;
      
      if (walletDoc.exists) {
        previousBalance = walletDoc.data()?.balance || 0;
        newBalance = previousBalance + creditsToAdd;
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

      // 3. Create Audit Record (Requested Format)
      const auditRef = db.collection('adminActivity').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        targetUid: uid,
        targetEmail: targetUserEmail,
        creditsAdded: creditsToAdd,
        previousBalance,
        newBalance,
        action: 'admin_gift',
        adminIdentifier: adminUser.email,
        timestamp: new Date().toISOString()
      });
    });

    res.json({ success: true, message: `Successfully gifted ${creditsToAdd} credits to user ${uid}.` });
  } catch (error: any) {
    console.error('Admin gift credits error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// GET /transactions: Protected. Returns recent admin gift transactions
router.get('/transactions', envAdminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('adminActivity')
      .where('action', '==', 'admin_gift')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    const transactions = snapshot.docs.map(doc => doc.data());
    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error('Admin fetch transactions error:', error);
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

export default router;
