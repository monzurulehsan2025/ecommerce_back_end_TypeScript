import type { Request, Response } from 'express';
import { RelayService } from '../services/RelayService.js';
import { PerformanceMonitor } from '../services/PerformanceMonitor.js';
import type { PaymentRequest } from '../models/types.js';
import { z } from 'zod';

const relayService = new RelayService();
const monitor = PerformanceMonitor.getInstance();

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
        deviceIp: z.string(),
        timestamp: z.string().datetime()
    })
});

export class PaymentController {
    public static async processPayment(req: Request, res: Response) {
        try {
            const validation = PaymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid payment data',
                    details: validation.error.format()
                });
            }

            const paymentRequest = validation.data as PaymentRequest;

            // Orchestrate payment with risk, failover and circuit breaker
            const orchestration = await relayService.orchestrate(paymentRequest);
            const { result, risk } = orchestration;

            // Return premium response with deep insights
            return res.status(200).json({
                status: 'success',
                transaction: result,
                telemetry: {
                    riskAssessment: {
                        level: risk.level,
                        score: risk.score,
                        flags: risk.flags
                    },
                    routingLogic: {
                        reason: PaymentController.getOptimizationReason(result.gatewayId),
                        retries: result.retries || 0,
                        gateway: result.gatewayId,
                        wasRecovered: result.retries ? true : false
                    },
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

    /**
     * Health & Performance Metrics Endpoint (Internal Tooling)
     */
    public static async getMetrics(req: Request, res: Response) {
        const health = monitor.getGlobalInsights();
        return res.status(200).json({
            status: 'success',
            service: 'Quantum-Orchestrator',
            timestamp: new Date().toISOString(),
            gateways: health
        });
    }

    private static getOptimizationReason(gatewayId: string): string {
        switch (gatewayId) {
            case 'uk_local': return 'Optimization: Localized UK routing for 2-5% higher approval rates.';
            case 'adyen_eu': return 'Optimization: Regional EU routing for lower latency SLA.';
            case 'sec_vault': return 'Security: High-risk detected. Routed to Quantum Secure Vault with MFA.';
            case 'stripe_us': return 'Standard: Reliable global processing via Stripe default.';
            default: return 'Standard routing logic applied.';
        }
    }
}
