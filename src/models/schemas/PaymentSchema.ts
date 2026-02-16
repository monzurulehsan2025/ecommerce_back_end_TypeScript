import { z } from 'zod';

export const PaymentSchema = z.object({
    amount: z.number().positive(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'JPY']),
    paymentMethod: z.object({
        type: z.literal('card'),
        brand: z.enum(['visa', 'mastercard', 'amex']),
        last4: z.string().length(4),
        expiryMonth: z.number().min(1).max(12),
        expiryYear: z.number().min(2024),
        country: z.string()
    }),
    metadata: z.object({
        userId: z.string().uuid(),
        userLocation: z.object({
            city: z.string(),
            country: z.string(),
            timezone: z.string()
        }),
        deviceIp: z.string(),
        timestamp: z.string().datetime()
    })
});
