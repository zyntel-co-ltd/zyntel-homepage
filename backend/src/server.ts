import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSocket } from './config/socket';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

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

// Protected routes (REQUIRE AUTH)
app.use('/api/metadata', authenticateToken, metadataRoutes);
app.use('/api/revenue', authenticateToken, revenueRoutes);
app.use('/api/reception', authenticateToken, receptionRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/tat', authenticateToken, tatRoutes);
app.use('/api/tests', authenticateToken, testsRoutes);
app.use('/api/numbers', authenticateToken, numbersRoutes);
app.use('/api/tracker', authenticateToken, trackerRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);
app.use('/api/performance', authenticateToken, performanceRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;