import type { PaymentRequest, InternalRiskAssessment, RiskLevel } from '../models/types.js';
import { Logger } from '../utils/Logger.js';

export class RiskService {
    /**
     * Evaluates the risk of a transaction based on several heuristics.
     * Business Logic: Prevents dispute/chargeback before routing.
     */
    public static analyze(request: PaymentRequest): InternalRiskAssessment {
        let score = 0;
        const flags: string[] = [];

        // 1. High amount check
        score += this.checkAmount(request.amount, flags);

        // 2. Velocity simulation
        score += this.checkUserStatus(request.metadata.userId, flags);

        // 3. Currency/Location mismatch
        score += this.checkLocationMismatch(request, flags);

        // 4. Night-time high-risk window
        score += this.checkTimeWindow(request.metadata.timestamp, flags);

        const level = this.calculateLevel(score);

        const assessment = {
            score: Math.min(score, 100),
            level,
            flags
        };

        if (level === 'high') {
            Logger.warn(`High risk transaction detected! Score: ${assessment.score}, Flags: ${flags.join(', ')}`, 'RiskService');
        }

        return assessment;
    }

    private static checkAmount(amount: number, flags: string[]): number {
        if (amount > 5000) {
            flags.push('HIGH_TICKET_ITEM');
            return 65;
        }
        if (amount > 1000) {
            flags.push('MODERATE_TICKET_ITEM');
            return 30;
        }
        return 0;
    }

    private static checkUserStatus(userId: string, flags: string[]): number {
        if (userId.startsWith('0000')) {
            flags.push('NEW_USER_UNVERIFIED');
            return 20;
        }
        return 0;
    }

    private static checkLocationMismatch(request: PaymentRequest, flags: string[]): number {
        const country = request.metadata.userLocation.country;
        if (request.currency === 'USD' && !['US', 'UK', 'CA'].includes(country)) {
            flags.push('CURRENCY_LOCATION_MISMATCH');
            return 25;
        }
        return 0;
    }

    private static checkTimeWindow(timestamp: string, flags: string[]): number {
        const hour = new Date(timestamp).getHours();
        if (hour >= 2 && hour <= 4) {
            flags.push('OFF_HOURS_TRANSACTION');
            return 10;
        }
        return 0;
    }

    private static calculateLevel(score: number): RiskLevel {
        if (score >= 60) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    }
}
