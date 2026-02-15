import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/v1/payments/process';

async function testRoute(name, payload) {
    console.log(`\n--- Testing Case: ${name} ---`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log('Target Gateway:', data.data?.gatewayId);
        console.log('Impact Reward:', data.insights?.optimizationReason);
        console.log('Processing Fee:', data.data?.fee);
        console.log('Response Time:', data.data?.processingTimeMs, 'ms');
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
    // 1. London at 3 AM logic
    const londonNight = JSON.parse(JSON.stringify(basePayload));
    londonNight.metadata.timestamp = new Date(new Date().setHours(3, 0, 0, 0)).toISOString();
    await testRoute('London (3:00 AM) - Local UK Route', londonNight);

    // 2. Paris during the day
    const parisDay = JSON.parse(JSON.stringify(basePayload));
    parisDay.metadata.userLocation.city = 'Paris';
    parisDay.metadata.userLocation.country = 'FR';
    parisDay.metadata.timestamp = new Date(new Date().setHours(14, 0, 0, 0)).toISOString();
    await testRoute('Paris (2:00 PM) - Adyen EU Route', parisDay);

    // 3. New York
    const ny = JSON.parse(JSON.stringify(basePayload));
    ny.metadata.userLocation.city = 'New York';
    ny.metadata.userLocation.country = 'US';
    ny.currency = 'USD';
    await testRoute('New York - Stripe Default Route', ny);
}

// Note: This requires node-fetch to be installed if running outside the workspace, 
// but since we are just writing it for the user to see/use, it's fine.
// I'll add node-fetch to dependencies just in case.
console.log('Note: To run this test, first start the server with "npm run dev"');

runTests();
