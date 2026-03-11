
import 'dotenv/config';
import geniuspay from './backend/services/geniuspay.js';

async function test() {
    const credentials = {
        api_key: process.env.GENIUSPAY_API_KEY,
        api_secret: process.env.GENIUSPAY_API_SECRET
    };
    
    console.log('Testing GeniusPay with Key:', credentials.api_key ? 'Present' : 'Missing');
    
    const result = await geniuspay.createInvoiceWithCredentials(credentials, {
        amount: 1000,
        currency: 'XOF',
        description: 'Test payment',
        referenceId: 'test-' + Date.now(),
        returnUrl: 'http://localhost:5173',
        callbackUrl: 'http://localhost:3001/callback',
        customer: {
            name: 'Test',
            email: 'test@example.com'
        }
    });
    
    if (result) {
        console.log('Success!', result);
    } else {
        console.log('Failed. Check console errors above.');
    }
}

test();
