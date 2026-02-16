export class GatewayUtils {
    /**
     * Simulates a network call with latency and optional timeout.
     */
    public static async simulateNetworkCall<T>(
        operation: () => Promise<T>,
        latencyMs: number,
        timeoutMs: number = 5000
    ): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gateway Timeout')), timeoutMs)
        );

        const latencyPromise = new Promise<void>(resolve =>
            setTimeout(resolve, latencyMs)
        );

        return Promise.race([
            (async () => {
                await latencyPromise;
                return await operation();
            })(),
            timeoutPromise
        ]);
    }
}
