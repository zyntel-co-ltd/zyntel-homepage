import express, { Application } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeSocket } from './config/socket';
import { initializeScheduler } from './services/scheduler';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth'; // Changed from authenticateToken

// Import routes
import authRoutes from './routes/auth';
import metadataRoutes from './routes/metadata';
import revenueRoutes from './routes/revenue';
import receptionRoutes from './routes/reception';
import lridsRoutes from './routes/lrids';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import tatRoutes from './routes/tat';
import testsRoutes from './routes/tests';
import numbersRoutes from './routes/numbers';
import trackerRoutes from './routes/tracker';
import progressRoutes from './routes/progress';
import performanceRoutes from './routes/performance';
import encountersRoutes from './routes/encounters';
import labguruInsightsRoutes from './routes/labguruInsights';
import resultsRoutes from './routes/results';

dotenv.config();

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (NO AUTH)
app.use('/api/auth', authRoutes);
app.use('/api/lrids', lridsRoutes);

// Patient results: rate limit for high traffic (100/min per IP), no auth
const resultsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/results', resultsLimiter, resultsRoutes);

// Protected routes (REQUIRE AUTH)
app.use('/api/metadata', authenticate, metadataRoutes);
app.use('/api/meta', authenticate, metadataRoutes); // alias for meta table
app.use('/api/revenue', authenticate, revenueRoutes);
app.use('/api/reception', authenticate, receptionRoutes);
app.use('/api/settings', authenticate, settingsRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/tat', authenticate, tatRoutes);
app.use('/api/tests', authenticate, testsRoutes);
app.use('/api/numbers', authenticate, numbersRoutes);
app.use('/api/tracker', authenticate, trackerRoutes);
app.use('/api/progress', authenticate, progressRoutes);
app.use('/api/performance', authenticate, performanceRoutes);
app.use('/api/encounters', encountersRoutes);
app.use('/api/labguru-insights', authenticate, labguruInsightsRoutes);

// Production: serve built frontend (before error handler)
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // Compiled output is backend/dist/src/server.js, so go up 3 levels to project root
  const frontendDist = path.join(__dirname, '../../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST; // optional: bind to specific IP (e.g. 192.168.10.198 for hospital LAN only)

const listenCallback = () => {
  const bind = HOST ? `${HOST}:${PORT}` : `port ${PORT}`;
  console.log(`🚀 Server running on ${bind}`);
  console.log(`📡 Socket.io initialized`);
  initializeScheduler(); // Data pipeline (fetch → ingest) runs every 5 minutes
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`);
};

if (HOST) {
  server.listen(PORT, HOST, listenCallback);
} else {
  server.listen(PORT, listenCallback);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
