import type { PaymentRequest, GatewayResponse, RoutingRule, InternalRiskAssessment } from '../models/types.js';
import { RiskService } from './RiskService.js';
import { v4 as uuidv4 } from 'uuid';

export interface IPaymentGateway {
    id: string;
    name: string;
    uptime: number; // 0 to 1, simulated
    process(request: PaymentRequest): Promise<GatewayResponse>;
}

// Mock Gateways
class StripeGateway implements IPaymentGateway {
    id = 'stripe_us';
    name = 'Stripe (US East)';
    uptime = 0.99;
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 150));

        // Simulate intermittent failure for failover demonstration
        if (Math.random() < 0.05) throw new Error('Gateway Timeout');

        return {
            success: true,
            transactionId: `st_${uuidv4()}`,
            gatewayId: this.id,
            fee: request.amount * 0.029 + 0.3,
            processingTimeMs: Date.now() - startTime
        };
    }
}

class AdyenEuropeGateway implements IPaymentGateway {
    id = 'adyen_eu';
    name = 'Adyen (Europe/Amsterdam)';
    uptime = 0.995;
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 80));
        return {
            success: true,
            transactionId: `ad_${uuidv4()}`,
            gatewayId: this.id,
            fee: request.amount * 0.02 + 0.1,
            processingTimeMs: Date.now() - startTime
        };
    }
}

class UKLocalAcquirer implements IPaymentGateway {
    id = 'uk_local';
    name = 'UK Local Merchant Services';
    uptime = 0.98;
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 40));
        return {
            success: true,
            transactionId: `uk_${uuidv4()}`,
            gatewayId: this.id,
            fee: request.amount * 0.015 + 0.05,
            processingTimeMs: Date.now() - startTime
        };
    }
}

class HighSecurityGateway implements IPaymentGateway {
    id = 'sec_vault';
    name = 'Quantum Secure Vault (High Risk Only)';
    uptime = 1.0;
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        // High risk gate is slow because it performs extra verification (simulated)
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
            success: true,
            transactionId: `sv_${uuidv4()}`,
            gatewayId: this.id,
            fee: request.amount * 0.05 + 2.0, // Higher fees for protection
            processingTimeMs: Date.now() - startTime,
            message: 'Processed via High-Security MFA flow'
        };
    }
}

export class RelayService {
    private gateways: Map<string, IPaymentGateway> = new Map();

    constructor() {
        this.registerGateway(new StripeGateway());
        this.registerGateway(new AdyenEuropeGateway());
        this.registerGateway(new UKLocalAcquirer());
        this.registerGateway(new HighSecurityGateway());
    }

    private registerGateway(gateway: IPaymentGateway) {
        this.gateways.set(gateway.id, gateway);
    }

    /**
     * REFACTORED ORCHESTRATOR
     * Includes: Risk Analysis, Multi-Criteria Routing, and Auto-Failover
     */
    public async orchestrate(request: PaymentRequest): Promise<{ result: GatewayResponse, risk: InternalRiskAssessment }> {
        const startTime = Date.now();
        console.log(`[RelayService] New incoming request: ${request.amount} ${request.currency}`);

        // 1. DYNAMIC RISK ASSESSMENT (Anti-Chargeback Logic)
        const risk = RiskService.analyze(request);
        console.log(`[RelayService] Risk Assessment: ${risk.level.toUpperCase()} (Score: ${risk.score})`);

        // 2. DECIDE PRIMARY GATEWAY
        let primaryGatewayId: string;

        if (risk.level === 'high') {
            console.log('[Orchestration Engine] HIGH RISK detected. Overriding to Secure Vault.');
            primaryGatewayId = 'sec_vault';
        } else {
            primaryGatewayId = this.decideRegularGateway(request);
        }

        const gateway = this.gateways.get(primaryGatewayId) || this.gateways.get('stripe_us')!;

        // 3. ATTEMPT PROCESSING WITH AUTO-FAILOVER
        try {
            console.log(`[RelayService] Primary Route: ${gateway.name}`);
            const result = await gateway.process(request);
            return { result, risk };
        } catch (error: any) {
            console.warn(`[RelayService] Primary Route FAILED (${error.message}). Initiating Dynamic Failover...`);

            // Failover to Stripe (our most resilient global partner)
            const failoverGateway = this.gateways.get('stripe_us')!;
            const result = await failoverGateway.process(request);

            return {
                result: {
                    ...result,
                    retries: 1,
                    originalError: error.message,
                    message: 'Auto-Recovered via Dynamic Failover'
                },
                risk
            };
        }
    }

    private decideRegularGateway(request: PaymentRequest): string {
        const { metadata, paymentMethod } = request;
        const hour = new Date(metadata.timestamp).getHours();

        // London Night Optimization
        if (metadata.userLocation.city.toLowerCase() === 'london' &&
            paymentMethod.brand === 'visa' &&
            (hour >= 0 && hour <= 5)) {
            return 'uk_local';
        }

        // Regional EU Routing
        if (['UK', 'FR', 'DE', 'ES', 'IT'].includes(metadata.userLocation.country)) {
            return 'adyen_eu';
        }

        return 'stripe_us';
    }
}
