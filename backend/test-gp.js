import db from './database/init.js';
import geniuspay from './services/geniuspay.js';

async function test() {
    const credentials = {
        api_key: process.env.GENIUSPAY_API_KEY,
        api_secret: process.env.GENIUSPAY_API_SECRET
    };

    console.log("Credentials loaded:", !!credentials.api_key);

    const res = await geniuspay.createSubscriptionWithCredentials(credentials, {
        planId: 'starter',
        billingCycle: 'monthly',
        amount: 15000,
        currency: 'XOF',
        description: 'Test Abo',
        customer: { name: 'Test', email: 'test@example.com', phone: '+2250700000000' },
        returnUrl: 'http://localhost/success',
        callbackUrl: 'http://localhost/webhook',
        metadata: { test: 1 }
    });
    console.log("Result:", res);
}
test();
