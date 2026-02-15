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
}
