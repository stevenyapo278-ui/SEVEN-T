/**
 * Subscription Manager
 * Handles SaaS subscription lifecycle: grace periods, reminders, and plan downgrades.
 */
import db from '../database/init.js';
import emailService from './email.js';
import { whatsappManager } from './whatsapp.js';
import geniusPay from './geniuspay.js';

/**
 * Get system WhatsApp settings from platform_settings
 */
export async function getSystemWhatsAppConfig() {
    const toolIdRow = await db.get('SELECT value FROM platform_settings WHERE key = ?', 'system_whatsapp_tool_id');
    const numberRow = await db.get('SELECT value FROM platform_settings WHERE key = ?', 'system_whatsapp_number');
    return {
        toolId: toolIdRow?.value || null,
        number: numberRow?.value || null
    };
}

/**
 * Send a WhatsApp message from the system account
 */
export async function sendSystemWhatsApp(userId, message) {
    const config = await getSystemWhatsAppConfig();
    if (!config.toolId) {
        console.warn('[SubManager] System WhatsApp tool ID not configured.');
        return false;
    }

    if (!whatsappManager.isConnected(config.toolId)) {
        console.warn(`[SubManager] System WhatsApp account (${config.toolId}) is not connected.`);
        return false;
    }

    const user = await db.get('SELECT phone FROM users WHERE id = ?', userId);
    if (!user?.phone) {
        console.warn(`[SubManager] No phone number for user ${userId}`);
        return false;
    }

    // Prepare JID
    let jid = user.phone.replace(/\D/g, '');
    if (!jid.includes('@')) {
        jid = `${jid}@s.whatsapp.net`;
    }

    try {
        await whatsappManager.sendMessage(config.toolId, jid, message);
        console.log(`[SubManager] WhatsApp reminder sent to user ${userId}`);
        return true;
    } catch (e) {
        console.error(`[SubManager] Error sending WhatsApp: ${e.message}`);
        return false;
    }
}

/**
 * Review all active/past_due subscriptions and take action based on expiry and grace period.
 * Typically run once per day via cron.
 */
export async function runSubscriptionReview() {
    console.log('[SubManager] Starting subscription review job...');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 1. Find subscriptions expiring soon (J-2)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];

    const expiringSoon = await db.all(`
        SELECT s.*, u.email, u.name, u.phone 
        FROM saas_subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active' 
        AND s.current_period_end::date = ?::date
    `, twoDaysFromNowStr);

    for (const sub of expiringSoon) {
        const msg = `Bonjour ${sub.name}, votre abonnement SEVEN T arrive à échéance dans 2 jours. Le renouvellement se fera automatiquement. Merci de votre fidélité !`;
        await sendSystemWhatsApp(sub.user_id, msg);
        // Also send email
        await emailService.sendEmail({
            to: sub.email,
            subject: 'Votre abonnement arrive à échéance prochainement',
            html: `<h1>Bonjour ${sub.name}</h1><p>${msg}</p>`
        });
    }

    // 2. Find subscriptions expiring TODAY (J)
    const expiringToday = await db.all(`
        SELECT s.*, u.email, u.name 
        FROM saas_subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active'
        AND s.current_period_end::date = ?::date
    `, today);

    for (const sub of expiringToday) {
        // Technically GeniusPay will try to bill. We wait for Webhook.
        // But we can send a "Renewing today" notice.
        console.log(`[SubManager] Sub ${sub.id} expires today. Waiting for renewal webhook.`);
    }

    // 3. Find PAST_DUE subscriptions (failed payment) - 3 days grace period
    // If status is past_due, we check updated_at or a specific last_failed_at field.
    // For now let's assume current_period_end + 3 days.
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const graceExpired = await db.all(`
        SELECT s.*, u.email, u.name 
        FROM saas_subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'past_due'
        AND s.current_period_end::date <= ?::date
    `, threeDaysAgoStr);

    for (const sub of graceExpired) {
        console.log(`[SubManager] Grace period expired for user ${sub.user_id}. Downgrading to free_expired.`);
        
        // Update user plan
        await db.run('UPDATE users SET plan = ?, subscription_status = ? WHERE id = ?', 'free_expired', 'expired', sub.user_id);
        
        // Update subscription status
        await db.run('UPDATE saas_subscriptions SET status = ? WHERE id = ?', 'expired', sub.id);
        
        const msg = `Bonjour ${sub.name}, suite à l'échec de votre paiement et après notre période de grâce de 3 jours, votre accès a été restreint. Merci de régulariser votre situation pour retrouver vos accès.`;
        await sendSystemWhatsApp(sub.user_id, msg);
        await emailService.sendEmail({
            to: sub.email,
            subject: 'Accès restreint - Abonnement expiré',
            html: `<h1>Bonjour ${sub.name}</h1><p>${msg}</p>`
        });
    }

    // 4. Find subscriptions in PAST_DUE that have NOT yet reached 3 days (Relance J+1, J+2)
    // Needs a more precise logic based on days since expiry.
    // ...
    
    console.log('[SubManager] Subscription review job completed.');
}

export async function runSubscriptionReviewJob() {
    try {
        await runSubscriptionReview();
    } catch (error) {
        console.error('[SubscriptionReviewJob] Error:', error);
    }
}

export default {
    getSystemWhatsAppConfig,
    sendSystemWhatsApp,
    runSubscriptionReview,
    runSubscriptionReviewJob
};
