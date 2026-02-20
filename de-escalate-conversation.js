/**
 * Quick script to de-escalate a conversation
 */
import db from './backend/database/init.js';

const conversationId = process.argv[2];

if (!conversationId) {
    console.log('Usage: node de-escalate-conversation.js <conversation_id>');
    process.exit(1);
}

try {
    // Update conversation
    const result = db.prepare('UPDATE conversations SET human_takeover = 0 WHERE id = ?').run(conversationId);
    
    if (result.changes > 0) {
        console.log(`✅ Conversation ${conversationId} de-escalated successfully`);
        
        // Show current state
        const conv = db.prepare('SELECT id, human_takeover, needs_human, contact_number FROM conversations WHERE id = ?').get(conversationId);
        console.log('\nCurrent state:');
        console.log('  ID:', conv.id);
        console.log('  Contact:', conv.contact_number);
        console.log('  Human Takeover:', conv.human_takeover ? 'YES (blocked)' : 'NO (AI can respond)');
        console.log('  Needs Human:', conv.needs_human ? 'YES' : 'NO');
    } else {
        console.log(`❌ Conversation ${conversationId} not found`);
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
