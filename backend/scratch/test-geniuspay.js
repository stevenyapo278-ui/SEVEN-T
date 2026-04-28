import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import geniuspay from '../services/geniuspay.js';

async function run() {
    const credentials = {
        api_key: process.env.GENIUSPAY_API_KEY,
        api_secret: process.env.GENIUSPAY_API_SECRET
    };
    
    console.log("Testing GeniusPay API...");
    const result = await geniuspay.createSubscriptionWithCredentials(credentials, {
        planId: 'pro',
        amount: 10000,
        currency: 'XOF',
        description: 'Test Sub',
        customer: { name: 'Test User', email: 'test@example.com' },
        returnUrl: 'http://localhost/return',
        callbackUrl: 'http://localhost/callback',
        metadata: { test: 1 }
    });
    
    console.log("Result:", result);
}

run();
