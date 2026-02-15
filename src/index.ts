import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/payments', paymentRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
    console.log(`
  🚀 Quantum Ecommerce - Payment Orchestration API
  ------------------------------------------------
  Service Status: Running
  Environment: ${process.env.NODE_ENV || 'development'}
  Endpoint: http://localhost:${PORT}/api/v1/payments/process
  
  Logic: Dynamic Relay Service enabled.
  ------------------------------------------------
  `);
});
