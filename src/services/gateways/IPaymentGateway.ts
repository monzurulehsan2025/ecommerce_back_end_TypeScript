import type { PaymentRequest, GatewayResponse } from '../../models/types.js';

export interface IPaymentGateway {
    id: string;
    name: string;
    uptime: number; // 0 to 1, simulated
    /**
     * @param request The payment request to process
     * @param timeout Optional timeout in milliseconds for the gateway response
     */
    process(request: PaymentRequest, timeout?: number): Promise<GatewayResponse>;
}
