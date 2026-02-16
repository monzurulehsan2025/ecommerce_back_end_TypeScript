import type { PaymentRequest, GatewayResponse } from '../../models/types.js';

export interface IPaymentGateway {
    id: string;
    name: string;
    uptime: number; // 0 to 1, simulated
    process(request: PaymentRequest): Promise<GatewayResponse>;
}
