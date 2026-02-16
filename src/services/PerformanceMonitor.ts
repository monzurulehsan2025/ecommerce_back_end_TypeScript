import type { GatewayPerformanceMetrics } from '../models/types.js';
import { Logger } from '../utils/Logger.js';

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

class GatewayStats {
    public totalRequests = 0;
    public successfulRequests = 0;
    public totalLatency = 0;
    public consecutiveFailures = 0;
    public lastFailureTime = 0;
    public state: CircuitState = CircuitState.CLOSED;

    public update(success: boolean, latency: number) {
        this.totalRequests++;
        if (success) {
            this.successfulRequests++;
            this.totalLatency += latency;
            this.consecutiveFailures = 0;
            if (this.state === CircuitState.HALF_OPEN) {
                this.state = CircuitState.CLOSED;
            }
        } else {
            this.consecutiveFailures++;
            this.lastFailureTime = Date.now();
        }
    }

    public getMetrics(): GatewayPerformanceMetrics {
        return {
            avgLatencyMs: this.totalRequests > 0 ? this.totalLatency / Math.max(this.successfulRequests, 1) : 0,
            approvalRate: this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 1,
            totalVolume: this.totalRequests,
            circuitState: this.state,
            lastErrorRate: this.totalRequests > 0 ? (this.totalRequests - this.successfulRequests) / this.totalRequests : 0
        };
    }
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private stats: Map<string, GatewayStats> = new Map();
    private readonly RECOVERY_TIMEOUT = 30000; // 30 seconds
    private readonly FAILURE_THRESHOLD = 3;

    private constructor() { }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public record(gatewayId: string, success: boolean, latency: number) {
        if (!this.stats.has(gatewayId)) {
            this.stats.set(gatewayId, new GatewayStats());
        }
        const stat = this.stats.get(gatewayId)!;
        stat.update(success, latency);

        // Dynamic Circuit Breaker Logic
        if (stat.consecutiveFailures >= this.FAILURE_THRESHOLD && stat.state === CircuitState.CLOSED) {
            Logger.warn(`🚨 Opening circuit for ${gatewayId} due to high failure rate.`, 'CircuitBreaker');
            stat.state = CircuitState.OPEN;
        }

        // Attempt recovery after timeout
        if (stat.state === CircuitState.OPEN && Date.now() - stat.lastFailureTime > this.RECOVERY_TIMEOUT) {
            Logger.info(`🛡️ Attempting recovery for ${gatewayId} (HALF_OPEN).`, 'CircuitBreaker');
            stat.state = CircuitState.HALF_OPEN;
        }
    }

    public isHealthy(gatewayId: string): boolean {
        const stat = this.stats.get(gatewayId);
        if (!stat) return true;

        if (stat.state === CircuitState.OPEN) {
            // Recheck timeout on every check
            if (Date.now() - stat.lastFailureTime > this.RECOVERY_TIMEOUT) {
                stat.state = CircuitState.HALF_OPEN;
                return true;
            }
            return false;
        }
        return true;
    }

    public getGlobalInsights() {
        const insights: Record<string, GatewayPerformanceMetrics> = {};
        this.stats.forEach((stat, id) => {
            insights[id] = stat.getMetrics();
        });
        return insights;
    }
}
