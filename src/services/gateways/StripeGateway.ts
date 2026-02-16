import { v4 as uuidv4 } from 'uuid';
import type { PaymentRequest, GatewayResponse } from '../../models/types.js';
import type { IPaymentGateway } from './IPaymentGateway.js';
import { GatewayUtils } from '../../utils/GatewayUtils.js';

export class StripeGateway implements IPaymentGateway {
    id = 'stripe_us';
    name = 'Stripe (US East)';
    uptime = 0.99;

    async process(request: PaymentRequest, timeout: number = 2000): Promise<GatewayResponse> {
        const startTime = Date.now();

        return await GatewayUtils.simulateNetworkCall(async () => {
            // Simulate intermittent failure (10x traffic often uncovers these)
            if (Math.random() < 0.05) throw new Error('Gateway Connection Reset');

            return {
                success: true,
                transactionId: `st_${uuidv4()}`,
                gatewayId: this.id,
                fee: request.amount * 0.029 + 0.3,
                processingTimeMs: Date.now() - startTime
            };
        }, 150, timeout);
    }
}
