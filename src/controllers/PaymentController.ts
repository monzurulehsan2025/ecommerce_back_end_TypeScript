import type { Request, Response } from 'express';
import { RelayService } from '../services/RelayService.js';
import { PerformanceMonitor } from '../services/PerformanceMonitor.js';
import type { PaymentRequest } from '../models/types.js';
import { PaymentSchema } from '../models/schemas/PaymentSchema.js';
import { Logger } from '../utils/Logger.js';
import { AppError, ValidationError } from '../utils/AppError.js';

const relayService = new RelayService();
const monitor = PerformanceMonitor.getInstance();

export class PaymentController {
    /**
     * @route POST /api/v1/payments/process
     */
    public static async processPayment(req: Request, res: Response) {
        try {
            const validation = PaymentSchema.safeParse(req.body);
            if (!validation.success) {
                throw new ValidationError('Invalid payment data', validation.error.format());
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
                        wasRecovered: !!result.retries
                    },
                    processedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                    details: error instanceof ValidationError ? error.details : undefined,
                    traceId: req.headers['x-request-id'] || 'system'
                });
            }

            Logger.error('Unexpected error in processPayment', error, 'PaymentController');
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error during payment orchestration',
                traceId: req.headers['x-request-id'] || 'system'
            });
        }
    }

    /**
     * @route GET /api/v1/payments/metrics
     */
    public static async getMetrics(req: Request, res: Response) {
        try {
            const health = monitor.getGlobalInsights();
            return res.status(200).json({
                status: 'success',
                service: 'Quantum-Orchestrator',
                timestamp: new Date().toISOString(),
                gateways: health
            });
        } catch (error: any) {
            Logger.error('Error fetching metrics', error, 'PaymentController');
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve metrics'
            });
        }
    }

    private static getOptimizationReason(gatewayId: string): string {
        const reasons: Record<string, string> = {
            'uk_local': 'Optimization: Localized UK routing for 2-5% higher approval rates.',
            'adyen_eu': 'Optimization: Regional EU routing for lower latency SLA.',
            'sec_vault': 'Security: High-risk detected. Routed to Quantum Secure Vault with MFA.',
            'stripe_us': 'Standard: Reliable global processing via Stripe default.'
        };
        return reasons[gatewayId] || 'Standard routing logic applied.';
    }
}
