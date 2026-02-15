import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/v1/payments';

async function testRoute(name, payload) {
    console.log(`\n--- [TEST] ${name} ---`);
    try {
        const response = await fetch(`${BASE_URL}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.status === 'success') {
            console.log('✅ Gateway:', data.transaction.gatewayId);
            console.log('🛡️  Risk Level:', data.telemetry.riskAssessment.level.toUpperCase(), `(Score: ${data.telemetry.riskAssessment.score})`);
            console.log('💡 Logic:', data.telemetry.routingLogic.reason);
            if (data.telemetry.routingLogic.wasRecovered) {
                console.log('⚡ RECOV:', 'YES (Circuit Breaker or Failover triggered)');
            }
            console.log('⏱️  Time:', data.transaction.processingTimeMs, 'ms');
        } else {
            console.log('❌ Failed:', data.message || 'Validation Error');
        }
    } catch (error) {
        console.error('Test failed. Is the server running?', error.message);
    }
}

async function showMetrics() {
    console.log('\n📊 --- [GATEWAY PERFORMANCE METRICS] ---');
    try {
        const response = await fetch(`${BASE_URL}/metrics`);
        const data = await response.json();
        console.table(data.gateways);
    } catch (error) {
        console.error('Could not fetch metrics.');
    }
}

const basePayload = {
    amount: 250.00,
    currency: 'GBP',
    paymentMethod: {
        type: 'card', brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2026, country: 'UK'
    },
    metadata: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userLocation: { city: 'London', country: 'UK', timezone: 'Europe/London' },
        deviceIp: '1.2.3.4',
        timestamp: new Date().toISOString()
    }
};

async function runTests() {
    console.log('🚀 Starting Quantum Advanced Orchestration Suite...');

    // 1. Show initial metrics
    await showMetrics();

    // 2. High risk transaction
    const highRisk = JSON.parse(JSON.stringify(basePayload));
    highRisk.amount = 8000;
    await testRoute('High Risk (7.5k+) - Secure Vault', highRisk);

    // 3. Stress test for failures & metrics
    console.log('\n--- Generating Traffic (5 Requests) ---');
    for (let i = 0; i < 5; i++) {
        await testRoute(`Transaction ${i + 1}`, basePayload);
    }

    // 4. Show final metrics with performance & health
    await showMetrics();
}

runTests();
