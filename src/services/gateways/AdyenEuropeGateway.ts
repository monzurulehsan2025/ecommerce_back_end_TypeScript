import { v4 as uuidv4 } from 'uuid';
import type { PaymentRequest, GatewayResponse } from '../../models/types.js';
import type { IPaymentGateway } from './IPaymentGateway.js';
import { GatewayUtils } from '../../utils/GatewayUtils.js';

export class AdyenEuropeGateway implements IPaymentGateway {
    id = 'adyen_eu';
    name = 'Adyen (Europe/Amsterdam)';
    uptime = 0.995;

    async process(request: PaymentRequest, timeout: number = 2000): Promise<GatewayResponse> {
        const startTime = Date.now();

        return await GatewayUtils.simulateNetworkCall(async () => {
            return {
                success: true,
                transactionId: `ad_${uuidv4()}`,
                gatewayId: this.id,
                fee: request.amount * 0.02 + 0.1,
                processingTimeMs: Date.now() - startTime
            };
        }, 80, timeout);
    }
}
