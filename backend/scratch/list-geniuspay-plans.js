import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import fetch from 'node-fetch';

async function run() {
    const apiKey = process.env.GENIUSPAY_API_KEY;
    const apiSecret = process.env.GENIUSPAY_API_SECRET;
    const baseUrl = 'https://pay.genius.ci/api/v1/merchant';
    
    console.log("Listing GeniusPay Plans...");
    try {
        const res = await fetch(`${baseUrl}/plans`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEVEN-T/1.0',
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
