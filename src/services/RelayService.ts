import type { PaymentRequest, GatewayResponse, RoutingRule } from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface IPaymentGateway {
    id: string;
    name: string;
    process(request: PaymentRequest): Promise<GatewayResponse>;
}

// Mock Gateways
class StripeGateway implements IPaymentGateway {
    id = 'stripe_us';
    name = 'Stripe (US East)';
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulating latency
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
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 80)); // Lower latency for EU users
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
    async process(request: PaymentRequest): Promise<GatewayResponse> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 40)); // Extremely low local latency
        return {
            success: true,
            transactionId: `uk_${uuidv4()}`,
            gatewayId: this.id,
            fee: request.amount * 0.015 + 0.05, // Lower fees for local processing
            processingTimeMs: Date.now() - startTime
        };
    }
}

export class RelayService {
    private gateways: Map<string, IPaymentGateway> = new Map();

    constructor() {
        this.registerGateway(new StripeGateway());
        this.registerGateway(new AdyenEuropeGateway());
        this.registerGateway(new UKLocalAcquirer());
    }

    private registerGateway(gateway: IPaymentGateway) {
        this.gateways.set(gateway.id, gateway);
    }

    public async orchestrate(request: PaymentRequest): Promise<GatewayResponse> {
        console.log(`[RelayService] Received payment request: ${request.amount} ${request.currency} from ${request.metadata.userLocation.city}`);

        const gatewayId = this.decideGateway(request);
        const gateway = this.gateways.get(gatewayId) || this.gateways.get('stripe_us')!;

        console.log(`[RelayService] Routing transaction to: ${gateway.name} (ID: ${gateway.id})`);

        return await gateway.process(request);
    }

    private decideGateway(request: PaymentRequest): string {
        const { metadata, paymentMethod } = request;
        const hour = new Date(metadata.timestamp).getHours();

        // DYNAMIC ORCHESTRATION LOGIC (As per implementation requirements)

        // 1. Specific optimization for UK-based transactions at night
        if (
            metadata.userLocation.city.toLowerCase() === 'london' &&
            paymentMethod.brand === 'visa' &&
            (hour >= 0 && hour <= 5)
        ) {
            console.log('[Orchestration Engine] Match: London Night Route (Low Latency Local Acquirer)');
            return 'uk_local';
        }

        // 2. Regional optimization for Europe
        if (metadata.userLocation.country === 'UK' || metadata.userLocation.country === 'FR' || metadata.userLocation.country === 'DE') {
            console.log('[Orchestration Engine] Match: European Region Route (Adyen EU)');
            return 'adyen_eu';
        }

        // Default route
        console.log('[Orchestration Engine] Match: Default Global Route (Stripe US)');
        return 'stripe_us';
    }
}
