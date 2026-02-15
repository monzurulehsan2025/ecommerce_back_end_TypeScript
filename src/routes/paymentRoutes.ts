import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();

/**
 * @route POST /api/v1/payments/process
 * @desc Process a payment with dynamic orchestration (routing)
 */
router.post('/process', PaymentController.processPayment);

// Health check
router.get('/health', (req, res) => res.status(200).json({ status: 'OK', service: 'Quantum-Relay-RelayService' }));

export default router;
