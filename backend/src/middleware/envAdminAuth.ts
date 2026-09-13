import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export const envAdminAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized', message: 'No authorization header provided.' });
      return;
    }
    const token = authHeader.split('Bearer ')[1].trim();
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    const email = decodedToken.email;
    
    const isEnvAdmin = email === process.env.ADMIN_EMAIL || email === 'yashwanthrao2626@gmail.com';
    
    if (isEnvAdmin) {
      (req as any).adminUser = { email: email, role: 'env_admin' };
      next();
    } else {
      res.status(403).json({ error: 'forbidden', message: 'User is not an admin.' });
    }
  } catch (error: any) {
    console.error('Env Admin Auth Middleware Error:', error.message);
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired admin token.' });
  }
};
