import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cluster from 'node:cluster';
import os from 'node:os';
import paymentRoutes from './routes/paymentRoutes.js';
import { Logger } from './utils/Logger.js';
import { AppError } from './utils/AppError.js';
import { PerformanceMonitor } from './services/PerformanceMonitor.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  Logger.info(`Primary process ${process.pid} is running`);

  // Initialize PerformanceMonitor in Primary to listen for metrics from workers
  PerformanceMonitor.getInstance();

  // Fork workers
  // For 10x traffic, we use all available cores
  const workersToFork = process.env.NODE_ENV === 'production' ? numCPUs : Math.min(numCPUs, 4);

  for (let i = 0; i < workersToFork; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    Logger.warn(`Worker ${worker.process.pid} died. Forking a replacement...`);
    cluster.fork();
  });

  Logger.info(`
  🚀 Quantum Ecommerce Cluster - Primary Node Started
  --------------------------------------------------
  Workers active: ${workersToFork}
  Load Balancing: Round Robin (Native)
  Monitoring: IPC-Aggregated Performance Stats
  --------------------------------------------------
  `);

} else {
  const app = express();

  // Security & Performance Middleware
  app.use(helmet()); // Secure headers
  app.use(compression()); // Gzip compression for 10x smaller payloads
  app.use(cors());
  app.use(express.json({ limit: '10kb' })); // Protection against large payloads

  // Rate Limiting to handle 10x traffic spikes gracefully
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    }
  });
  app.use('/api/', limiter);

  // Health Check for Load Balancers
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', pid: process.pid, uptime: process.uptime() });
  });

  // Routes
  app.use('/api/v1/payments', paymentRoutes);

  // 404 handler
  app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

  // Global Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Only log essential info in high traffic to avoid I/O bottleneck
    if (statusCode >= 500) {
      Logger.error(`${req.method} ${req.url} - ${err.message}`, err, `Worker:${process.pid}`);
    }

    res.status(statusCode).json({
      status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      details: err.details
    });
  });

  app.listen(PORT, () => {
    Logger.info(`Worker ${process.pid} started on port ${PORT}`, 'Server');
  });
}
