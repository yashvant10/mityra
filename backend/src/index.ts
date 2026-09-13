import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import config from './config';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import aiRoutes from './routes/ai';
import userRoutes from './routes/users';
import tryonRoutes from './routes/tryon';
import wardrobeRoutes from './routes/wardrobe';
import recommendationRoutes from './routes/recommendations';
import outfitsRoutes from './routes/outfits';
import productsRoutes from './routes/products';
import adminRoutes from './routes/admin';
import adminDashboardRoutes from './routes/adminDashboard';
import favoritesRoutes from './routes/favorites';
import paymentsRoutes from './routes/payments';
import ordersRoutes from './routes/orders';

dotenv.config();

const app = express();

// Global middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
// CORS: Allow frontend URL(s) from env + localhost for dev
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'TryOnX',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/outfits', outfitsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-dashboard', adminDashboardRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/orders', ordersRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║                                      ║
  ║   🚀 TryOnX Backend Server          ║
  ║   Running on port ${config.port}             ║
  ║   Environment: ${config.nodeEnv}       ║
  ║                                      ║
  ╚══════════════════════════════════════╝
  `);
  
  if (process.env.REPLICATE_API_TOKEN) {
    console.log('  🔥 Replicate token loaded successfully');
  } else {
    console.warn('  ⚠️ Replicate token missing in environment');
  }
  if (process.env.HUGGINGFACE_TOKEN) {
    console.log('  🤗 HuggingFace token loaded successfully');
  } else {
    console.warn('  ⚠️ HuggingFace token missing in environment');
  }
});

export default app;
