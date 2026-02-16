import { v4 as uuidv4 } from 'uuid';
import type { PaymentRequest, GatewayResponse } from '../../models/types.js';
import type { IPaymentGateway } from './IPaymentGateway.js';
import { GatewayUtils } from '../../utils/GatewayUtils.js';

export class UKLocalAcquirer implements IPaymentGateway {
    id = 'uk_local';
    name = 'UK Local Merchant Services';
    uptime = 0.98;

    async process(request: PaymentRequest, timeout: number = 1000): Promise<GatewayResponse> {
        const startTime = Date.now();

        return await GatewayUtils.simulateNetworkCall(async () => {
            return {
                success: true,
                transactionId: `uk_${uuidv4()}`,
                gatewayId: this.id,
                fee: request.amount * 0.015 + 0.05,
                processingTimeMs: Date.now() - startTime
            };
        }, 40, timeout);
    }
}
