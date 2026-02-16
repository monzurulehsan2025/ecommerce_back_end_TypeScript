import { v4 as uuidv4 } from 'uuid';
import type { PaymentRequest, GatewayResponse } from '../../models/types.js';
import type { IPaymentGateway } from './IPaymentGateway.js';

export class StripeGateway implements IPaymentGateway {
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
