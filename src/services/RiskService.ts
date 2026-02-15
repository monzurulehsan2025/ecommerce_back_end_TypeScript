import type { PaymentRequest, InternalRiskAssessment, RiskLevel } from '../models/types.js';

export class RiskService {
    /**
     * Evaluates the risk of a transaction based on several heuristics.
     * Business Logic: Prevents dispute/chargeback before routing.
     */
    public static analyze(request: PaymentRequest): InternalRiskAssessment {
        let score = 0;
        const flags: string[] = [];

        // 1. High amount check
        if (request.amount > 5000) {
            score += 65;
            flags.push('HIGH_TICKET_ITEM');
        } else if (request.amount > 1000) {
            score += 30;
            flags.push('MODERATE_TICKET_ITEM');
        }

        // 2. Velocity simulation (In real app, query DB for user's last X hour transactions)
        // We'll simulate this with a flag if the user is anonymous or new
        if (request.metadata.userId.startsWith('0000')) {
            score += 20;
            flags.push('NEW_USER_UNVERIFIED');
        }

        // 3. Currency/Location mismatch
        const country = request.metadata.userLocation.country;
        if (request.currency === 'USD' && country !== 'US' && country !== 'UK' && country !== 'CA') {
            score += 25;
            flags.push('CURRENCY_LOCATION_MISMATCH');
        }

        // 4. Night-time high-risk window (fraudsters often strike when support is low)
        const hour = new Date(request.metadata.timestamp).getHours();
        if (hour >= 2 && hour <= 4) {
            score += 10;
            flags.push('OFF_HOURS_TRANSACTION');
        }

        let level: RiskLevel = 'low';
        if (score >= 60) level = 'high';
        else if (score >= 30) level = 'medium';

        return { score: Math.min(score, 100), level, flags };
    }
}
