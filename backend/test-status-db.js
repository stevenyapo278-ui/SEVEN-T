import dotenv from 'dotenv';
dotenv.config();
import { db } from './database/init.js';
import { v4 as uuidv4 } from 'uuid';

async function testInsert() {
  const statusId = uuidv4();
  const dummyKey = {
    remoteJid: 'status@broadcast',
    fromMe: true,
    id: 'DUMMY_ID'
  };

  try {
    console.log('Testing insert with whatsapp_message_key...');
    await db.run(`
      INSERT INTO whatsapp_statuses (id, user_id, agent_id, type, content, whatsapp_message_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, statusId, 'test-user', 'test-agent', 'text', 'test-content', JSON.stringify(dummyKey), 'sent');
    
    console.log('Insert successful!');
    
    console.log('Testing update...');
    await db.run('UPDATE whatsapp_statuses SET whatsapp_message_key = ? WHERE id = ?', JSON.stringify(dummyKey), statusId);
    console.log('Update successful!');
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

testInsert();
