import db from './database/init.js';
(async () => {
    const pollId = '3EB0264B122903C8BCB210';
    const row = await db.get(`
                SELECT p.id, COALESCE(pr.wa_message_full, p.wa_message_full) as wa_message_full 
                FROM polls p
                LEFT JOIN poll_recipients pr ON p.id = pr.poll_id AND pr.wa_message_id = ?
                WHERE p.wa_message_id = ? 
                   OR pr.wa_message_id = ?
            `, pollId, pollId, pollId);
    
    if (row && row.wa_message_full) {
        const msg = JSON.parse(row.wa_message_full);
        console.log("messageContextInfo:", msg.messageContextInfo);
        const secret = msg.messageContextInfo?.messageSecret;
        console.log("Secret present?", !!secret, typeof secret);
        if (typeof secret === 'string') {
            console.log("Secret Buffer (raw Base64):", Buffer.from(secret, 'base64'));
        }
        if (secret && secret.type === 'Buffer') {
            console.log("Secret Buffer (JSON type Buffer):", Buffer.from(secret.data));
        }
    } else {
        console.log("Not found in db");
    }
})();
