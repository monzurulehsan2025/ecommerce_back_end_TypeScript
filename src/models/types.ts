export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface PaymentMethod {
    type: 'card';
    brand: 'visa' | 'mastercard' | 'amex';
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    country: string;
}

export interface TransactionMetadata {
    userId: string;
    userLocation: {
        city: string;
        country: string;
        timezone: string;
    };
    deviceIp: string;
    timestamp: string; // ISO string
}

export interface PaymentRequest {
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    metadata: TransactionMetadata;
}

export interface RoutingRule {
    id: string;
    name: string;
    priority: number;
    conditions: {
        field: string;
        operator: 'equals' | 'in' | 'between' | 'greaterThan' | 'lessThan';
        value: any;
    }[];
    targetGatewayId: string;
}

export interface GatewayResponse {
    success: boolean;
    transactionId: string;
    gatewayId: string;
    message?: string;
    fee: number;
    processingTimeMs: number;
    retries?: number;
    originalError?: string;
}

export interface GatewayPerformanceMetrics {
    avgLatencyMs: number;
    approvalRate: number;
    totalVolume: number;
    circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastErrorRate: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface InternalRiskAssessment {
    score: number; // 0 to 100
    level: RiskLevel;
    flags: string[];
}
