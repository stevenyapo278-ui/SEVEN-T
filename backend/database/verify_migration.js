import db from './init.js';

async function verify() {
    try {
        const convCols = await db.all("PRAGMA table_info(conversations)");
        const hasCustomerContext = convCols.some(c => c.name === 'customer_context');
        console.log('conversations.customer_context:', hasCustomerContext ? '✅' : '❌');

        const orderCols = await db.all("PRAGMA table_info(orders)");
        const hasRelanceCount = orderCols.some(c => c.name === 'proactive_relance_count');
        console.log('orders.proactive_relance_count:', hasRelanceCount ? '✅' : '❌');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verify();
