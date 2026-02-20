/**
 * Test script for order detection with refusal and question filtering
 * 
 * Run with: node backend/services/orderDetector.test-refusal.js
 */

import { orderDetector } from './orderDetector.js';
import db from '../database/init.js';

// Test cases
const TEST_CASES = [
    {
        name: 'Refus explicite avec question',
        message: 'Non je veux connaître le stockage de données d\'abord',
        shouldDetectOrder: false,
        reason: 'Commence par "Non" + contient question "connaître"'
    },
    {
        name: 'Question simple avec "je veux"',
        message: 'je veux savoir combien coûte le Samsung S21',
        shouldDetectOrder: false,
        reason: 'Question avec "savoir" et "combien"'
    },
    {
        name: 'Commande valide',
        message: 'je veux 2 Samsung S21 Ultra',
        shouldDetectOrder: true,
        reason: 'Intention d\'achat claire avec quantité'
    },
    {
        name: 'Refus temporaire',
        message: 'pas maintenant, je veux réfléchir',
        shouldDetectOrder: false,
        reason: 'Refus avec "pas maintenant"'
    },
    {
        name: 'Question sur disponibilité',
        message: 'le Samsung S21 est disponible?',
        shouldDetectOrder: false,
        reason: 'Question avec "?"'
    },
    {
        name: 'Demande d\'info',
        message: 'je voudrais avoir plus de détails sur le Samsung',
        shouldDetectOrder: false,
        reason: 'Question avec "détails"'
    },
    {
        name: 'Commande ferme',
        message: 'je prends le Samsung S21',
        shouldDetectOrder: true,
        reason: 'Intention d\'achat claire'
    },
    {
        name: 'Attente',
        message: 'attends je veux vérifier quelque chose',
        shouldDetectOrder: false,
        reason: 'Refus avec "attends"'
    },
    {
        name: 'Question sur caractéristiques',
        message: 'quelles sont les caractéristiques du Samsung S21?',
        shouldDetectOrder: false,
        reason: 'Question avec "quelles" et "caractéristiques"'
    },
    {
        name: 'Confirmation avec oui',
        message: 'oui je veux commander le Samsung S21',
        shouldDetectOrder: true,
        reason: 'Confirmation claire avec "commander"'
    }
];

async function runTests() {
    console.log('\n========================================');
    console.log('TEST: Order Detection with Refusal Filter');
    console.log('========================================\n');

    // Get a test user and create test product if needed
    const user = db.prepare('SELECT id FROM users LIMIT 1').get();
    if (!user) {
        console.error('❌ No user found in database. Please create a user first.');
        return;
    }

    // Check if Samsung S21 exists, if not create it
    let product = db.prepare('SELECT * FROM products WHERE name LIKE ? AND user_id = ?')
        .get('%Samsung S21%', user.id);
    
    if (!product) {
        console.log('Creating test product: Samsung S21 Ultra');
        const result = db.prepare(`
            INSERT INTO products (id, user_id, name, sku, price, stock, category, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            'test-product-s21',
            user.id,
            'Samsung S21 Ultra',
            'SAMS21U',
            125000,
            10,
            'Smartphones',
            1
        );
        
        product = db.prepare('SELECT * FROM products WHERE id = ?').get('test-product-s21');
    }

    // Create test conversation
    const conversationId = 'test-conv-refusal-' + Date.now();
    db.prepare(`
        INSERT INTO conversations (id, user_id, agent_id, contact_jid, contact_number, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        conversationId,
        user.id,
        'test-agent',
        '1234567890@s.whatsapp.net',
        '+1234567890',
        'active'
    );

    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);

    let passed = 0;
    let failed = 0;

    // Run each test case
    for (const testCase of TEST_CASES) {
        console.log(`\n📋 Test: ${testCase.name}`);
        console.log(`   Message: "${testCase.message}"`);
        console.log(`   Expected: ${testCase.shouldDetectOrder ? '✅ Order detected' : '❌ No order'}`);
        console.log(`   Reason: ${testCase.reason}`);

        try {
            const result = await orderDetector.analyzeMessage(
                testCase.message,
                user.id,
                conversation
            );

            const orderDetected = result !== null;
            const testPassed = orderDetected === testCase.shouldDetectOrder;

            if (testPassed) {
                console.log(`   Result: ✅ PASS - ${orderDetected ? 'Order detected' : 'No order detected'}`);
                passed++;
            } else {
                console.log(`   Result: ❌ FAIL - ${orderDetected ? 'Order detected' : 'No order detected'} (expected ${testCase.shouldDetectOrder ? 'order' : 'no order'})`);
                failed++;
            }

            // Clean up any created order
            if (result) {
                db.prepare('DELETE FROM orders WHERE id = ?').run(result.id);
                db.prepare('DELETE FROM order_items WHERE order_id = ?').run(result.id);
            }
        } catch (error) {
            console.log(`   Result: ❌ ERROR - ${error.message}`);
            failed++;
        }
    }

    // Clean up test data
    db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total tests: ${TEST_CASES.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success rate: ${Math.round(passed / TEST_CASES.length * 100)}%`);
    console.log('========================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
