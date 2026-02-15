import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/v1/payments/process';

async function testRoute(name, payload) {
    console.log(`\n--- [TEST] ${name} ---`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.status === 'success') {
            console.log('✅ Gateway:', data.transaction.gatewayId);
            console.log('🛡️  Risk Level:', data.telemetry.riskAssessment.level.toUpperCase(), `(Score: ${data.telemetry.riskAssessment.score})`);
            if (data.telemetry.riskAssessment.flags.length > 0) {
                console.log('🚩 Flags:', data.telemetry.riskAssessment.flags.join(', '));
            }
            console.log('💡 Logic:', data.telemetry.routingLogic.reason);
            console.log('⏱️  Time:', data.transaction.processingTimeMs, 'ms');
            if (data.transaction.retries) {
                console.log('🔄 Retries:', data.transaction.retries, '(Auto-Failover Triggered)');
            }
        } else {
            console.log('❌ Failed:', data.message || 'Validation Error');
        }
    } catch (error) {
        console.error('Test failed. Is the server running?', error.message);
    }
}

const basePayload = {
    amount: 250.00,
    currency: 'GBP',
    paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2026,
        country: 'UK'
    },
    metadata: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userLocation: {
            city: 'London',
            country: 'UK',
            timezone: 'Europe/London'
        },
        deviceIp: '1.2.3.4',
        timestamp: new Date().toISOString()
    }
};

async function runTests() {
    console.log('🚀 Starting Smart Orchestration Test Suite...');

    // 1. STANDARD LONDON NIGHT (Low Risk)
    const londonNight = JSON.parse(JSON.stringify(basePayload));
    londonNight.metadata.timestamp = new Date(new Date().setHours(3, 0, 0, 0)).toISOString();
    await testRoute('London (3:00 AM) - Optimized Local Route', londonNight);

    // 2. HIGH RISK TEST (High Ticket + Off Hours)
    const highRisk = JSON.parse(JSON.stringify(basePayload));
    highRisk.amount = 7500.00; // High ticket
    highRisk.metadata.timestamp = new Date(new Date().setHours(4, 0, 0, 0)).toISOString(); // Off hours
    await testRoute('High Risk (7.5k + 4:00 AM) - Secure Vault Route', highRisk);

    // 3. CURRENCY MISMATCH TEST (Medium Risk)
    const mismatch = JSON.parse(JSON.stringify(basePayload));
    mismatch.currency = 'USD';
    mismatch.metadata.userLocation.country = 'FR';
    await testRoute('Currency Mismatch - Adyen EU Route', mismatch);

    // 4. FAILOVER TEST (Simulated randomly in code, we'll try a few times)
    console.log('\n--- Running Failover Stress Test ---');
    for (let i = 0; i < 5; i++) {
        const failoverTrial = JSON.parse(JSON.stringify(basePayload));
        failoverTrial.metadata.userLocation.country = 'US'; // Route to Stripe US
        await testRoute(`Failover Trial ${i + 1}`, failoverTrial);
    }
}

runTests();
