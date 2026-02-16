import { v4 as uuidv4 } from 'uuid';
import type { PaymentRequest, GatewayResponse } from '../../models/types.js';
import type { IPaymentGateway } from './IPaymentGateway.js';

export class AdyenEuropeGateway implements IPaymentGateway {
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
