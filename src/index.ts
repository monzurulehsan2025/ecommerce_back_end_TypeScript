import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes.js';
import { Logger } from './utils/Logger.js';
import { AppError } from './utils/AppError.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

  Logger.error(`${req.method} ${req.url} - ${err.message}`, err, 'GlobalErrorHandler');

  res.status(statusCode).json({
    status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    details: err.details
  });
});

app.listen(PORT, () => {
  Logger.info(`
  🚀 Quantum Ecommerce - Payment Orchestration API
  ------------------------------------------------
  Service Status: Running
  Environment: ${process.env.NODE_ENV || 'development'}
  Endpoint: http://localhost:${PORT}/api/v1/payments/process
  
  Logic: Dynamic Relay Service enabled.
  ------------------------------------------------
  `, 'Server');
});
