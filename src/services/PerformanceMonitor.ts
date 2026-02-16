import type { GatewayPerformanceMetrics } from '../models/types.js';
import { Logger } from '../utils/Logger.js';
import cluster from 'node:cluster';

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export type MetricMessage =
    | { type: 'METRIC_UPDATE'; gatewayId: string; success: boolean; latency: number }
    | { type: 'GET_METRICS_REQUEST'; requestId: string }
    | { type: 'GET_METRICS_RESPONSE'; requestId: string; metrics: Record<string, GatewayPerformanceMetrics> };

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
    private readonly RECOVERY_TIMEOUT = 30000;
    private readonly FAILURE_THRESHOLD = 5;
    private pendingRequests: Map<string, (data: any) => void> = new Map();

    private constructor() {
        if (cluster.isPrimary) {
            this.setupPrimaryListener();
        } else {
            this.setupWorkerListener();
        }
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    private setupPrimaryListener() {
        cluster.on('message', (worker, message: MetricMessage) => {
            if (!message) return;

            if (message.type === 'METRIC_UPDATE') {
                this.internalRecord(message.gatewayId, message.success, message.latency);
            } else if (message.type === 'GET_METRICS_REQUEST') {
                worker.send({
                    type: 'GET_METRICS_RESPONSE',
                    requestId: message.requestId,
                    metrics: this.getGlobalInsights()
                });
            }
        });
    }

    private setupWorkerListener() {
        process.on('message', (message: MetricMessage) => {
            if (message && message.type === 'GET_METRICS_RESPONSE') {
                const resolve = this.pendingRequests.get(message.requestId);
                if (resolve) {
                    resolve(message.metrics);
                    this.pendingRequests.delete(message.requestId);
                }
            }
        });
    }

    public record(gatewayId: string, success: boolean, latency: number) {
        if (cluster.isWorker && process.send) {
            process.send({ type: 'METRIC_UPDATE', gatewayId, success, latency });
        }
        this.internalRecord(gatewayId, success, latency);
    }

    private internalRecord(gatewayId: string, success: boolean, latency: number) {
        if (!this.stats.has(gatewayId)) {
            this.stats.set(gatewayId, new GatewayStats());
        }
        const stat = this.stats.get(gatewayId)!;
        stat.update(success, latency);

        if (stat.consecutiveFailures >= this.FAILURE_THRESHOLD && stat.state === CircuitState.CLOSED) {
            Logger.warn(`🚨 Opening circuit for ${gatewayId}`, 'CircuitBreaker');
            stat.state = CircuitState.OPEN;
        }

        if (stat.state === CircuitState.OPEN && Date.now() - stat.lastFailureTime > this.RECOVERY_TIMEOUT) {
            stat.state = CircuitState.HALF_OPEN;
        }
    }

    public async getCentralizedInsights(): Promise<Record<string, GatewayPerformanceMetrics>> {
        if (cluster.isPrimary) {
            return this.getGlobalInsights();
        }

        return new Promise((resolve) => {
            const requestId = Math.random().toString(36).substring(7);
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                resolve(this.getGlobalInsights()); // Fallback to local
            }, 1000);

            this.pendingRequests.set(requestId, (data) => {
                clearTimeout(timeout);
                resolve(data);
            });

            process.send!({ type: 'GET_METRICS_REQUEST', requestId });
        });
    }

    public isHealthy(gatewayId: string): boolean {
        const stat = this.stats.get(gatewayId);
        if (!stat) return true;
        if (stat.state === CircuitState.OPEN) {
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
