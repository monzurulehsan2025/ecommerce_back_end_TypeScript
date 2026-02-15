import type { Request, Response } from 'express';
import { RelayService } from '../services/RelayService.js';
import type { PaymentRequest } from '../models/types.js';
import { z } from 'zod';

const relayService = new RelayService();

// Validation schema
const PaymentSchema = z.object({
    amount: z.number().positive(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'JPY']),
    paymentMethod: z.object({
        type: z.literal('card'),
        brand: z.enum(['visa', 'mastercard', 'amex']),
        last4: z.string().length(4),
        expiryMonth: z.number().min(1).max(12),
        expiryYear: z.number().min(2024),
        country: z.string()
    }),
    metadata: z.object({
        userId: z.string().uuid(),
        userLocation: z.object({
            city: z.string(),
            country: z.string(),
            timezone: z.string()
        }),
        deviceIp: z.string(), // Simple string for IP to avoid lint issues with old Zod versions
        timestamp: z.string().datetime()
    })
});

export class PaymentController {
    public static async processPayment(req: Request, res: Response) {
        try {
            // Validate input
            const validation = PaymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid payment data',
                    details: validation.error.format()
                });
            }

            const paymentRequest = validation.data as PaymentRequest;

            // Orchestrate payment
            const result = await relayService.orchestrate(paymentRequest);

            // Return premium response with insights
            return res.status(200).json({
                status: 'success',
                data: result,
                insights: {
                    optimizationReason: result.gatewayId === 'uk_local' ? 'Localized processing for improved approval rates' :
                        result.gatewayId === 'adyen_eu' ? 'Regional routing for lower latency' : 'Standard global processing',
                    processedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            console.error('[PaymentController] Error processing payment:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error during payment orchestration',
                traceId: req.headers['x-request-id'] || 'system'
            });
        }
    }
}
