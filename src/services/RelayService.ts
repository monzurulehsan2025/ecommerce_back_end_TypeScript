import type { PaymentRequest, GatewayResponse, InternalRiskAssessment } from '../models/types.js';
import { RiskService } from './RiskService.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { StripeGateway } from './gateways/StripeGateway.js';
import { AdyenEuropeGateway } from './gateways/AdyenEuropeGateway.js';
import { UKLocalAcquirer } from './gateways/UKLocalAcquirer.js';
import { HighSecurityGateway } from './gateways/HighSecurityGateway.js';
import type { IPaymentGateway } from './gateways/IPaymentGateway.js';
import { Logger } from '../utils/Logger.js';
import { PaymentGatewayError } from '../utils/AppError.js';

export class RelayService {
    private gateways: Map<string, IPaymentGateway> = new Map();
    private monitor = PerformanceMonitor.getInstance();
    private readonly DEFAULT_GATEWAY_ID = 'stripe_us';

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
     * SMART ORCHESTRATOR
     * Includes: Risk Analysis, Circuit Breaker, Performance Awareness, and Auto-Failover
     */
    public async orchestrate(request: PaymentRequest): Promise<{ result: GatewayResponse, risk: InternalRiskAssessment }> {
        const startTime = Date.now();
        Logger.info(`New incoming request: ${request.amount} ${request.currency}`, 'RelayService');

        const risk = RiskService.analyze(request);
        Logger.info(`Risk Assessment: ${risk.level.toUpperCase()} (Score: ${risk.score})`, 'RelayService');

        let primaryGatewayId: string;

        if (risk.level === 'high') {
            Logger.warn('[Orchestration Engine] HIGH RISK detected. Overriding to Secure Vault.');
            primaryGatewayId = 'sec_vault';
        } else {
            primaryGatewayId = this.decideRegularGateway(request);
        }

        // CIRCUIT BREAKER CHECK
        if (!this.monitor.isHealthy(primaryGatewayId)) {
            Logger.warn(`⚡ Circuit Open for ${primaryGatewayId}. Immediate Failover triggered.`, 'OrchestrationEngine');
            return this.executeWithFailover(request, this.DEFAULT_GATEWAY_ID, risk);
        }

        const gateway = this.gateways.get(primaryGatewayId) || this.gateways.get(this.DEFAULT_GATEWAY_ID)!;

        try {
            Logger.info(`Primary Route: ${gateway.name}`, 'RelayService');
            const result = await gateway.process(request);

            // RECORD PERFORMANCE
            this.monitor.record(primaryGatewayId, true, result.processingTimeMs);

            return { result, risk };
        } catch (error: any) {
            Logger.warn(`Primary Route FAILED (${error.message}). Recording and Failing Over...`, 'RelayService');

            // RECORD FAILURE
            this.monitor.record(primaryGatewayId, false, Date.now() - startTime);

            return this.executeWithFailover(request, this.DEFAULT_GATEWAY_ID, risk, error.message);
        }
    }

    private async executeWithFailover(request: PaymentRequest, failoverId: string, risk: InternalRiskAssessment, originalError?: string): Promise<{ result: GatewayResponse, risk: InternalRiskAssessment }> {
        const failoverGateway = this.gateways.get(failoverId);

        if (!failoverGateway) {
            throw new PaymentGatewayError(`Failover gateway ${failoverId} not found`, failoverId);
        }

        const startTime = Date.now();
        try {
            const result = await failoverGateway.process(request);

            // Record performance for failover too
            this.monitor.record(failoverId, true, result.processingTimeMs);

            return {
                result: {
                    ...result,
                    retries: 1,
                    originalError,
                    message: 'Auto-Recovered via Dynamic Failover'
                },
                risk
            };
        } catch (error: any) {
            Logger.error(`Failover Route FAILED: ${error.message}`, error, 'RelayService');
            throw new PaymentGatewayError(`Failover to ${failoverId} failed: ${error.message}`, failoverId);
        }
    }

    private decideRegularGateway(request: PaymentRequest): string {
        const { metadata, paymentMethod } = request;
        const hour = new Date(metadata.timestamp).getHours();

        // 1. UK Local Optimization Rule
        if (metadata.userLocation.city.toLowerCase() === 'london' &&
            paymentMethod.brand === 'visa' &&
            (hour >= 0 && hour <= 5)) {
            return 'uk_local';
        }

        // 2. Regional European Routing Rule
        const euCountries = ['UK', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE'];
        if (euCountries.includes(metadata.userLocation.country)) {
            return 'adyen_eu';
        }

        // 3. Fallback to standard
        return this.DEFAULT_GATEWAY_ID;
    }
}
