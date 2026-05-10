/**
 * Push Notification Service
 * Manages Web Push notifications using web-push
 */

import webpush from 'web-push';
import db from '../database/init.js';

// VAPID keys should ideally be in environment variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BCz37gL7SOa3QpUcYebNAQ3vFV6k6rIGOK_3Lt5HTgK4mbW1i9brXCtZmE4T3I6IQZ15wAMG6EIrtradwfl3k4k';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'JiVoo_G8COvg5JN1FDgYnQTxdHCrsaihCfMUb1VQN44';

webpush.setVapidDetails(
    'mailto:support@mysevent.app',
    publicVapidKey,
    privateVapidKey
);

class PushNotificationService {
    /**
     * Register a new push token for a user
     */
    async registerToken(userId, token, platform = 'web') {
        try {
            await db.run(`
                INSERT INTO push_tokens (user_id, token, platform)
                VALUES (?, ?, ?)
                ON CONFLICT (user_id, token) DO NOTHING
            `, userId, JSON.stringify(token), platform);
            return true;
        } catch (error) {
            console.error('[PushNotifications] Register error:', error);
            return false;
        }
    }

    /**
     * Unregister a push token
     */
    async unregisterToken(userId, token) {
        try {
            await db.run('DELETE FROM push_tokens WHERE user_id = ? AND token = ?', userId, JSON.stringify(token));
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Send a push notification to a user
     */
    async sendToUser(userId, { title, body, icon, url, data = {} }) {
        try {
            console.log(`[PushNotifications] Attempting to send to user ${userId}: ${title}`);
            const tokens = await db.all('SELECT token FROM push_tokens WHERE user_id = ?', userId);
            
            if (!tokens || tokens.length === 0) {
                console.log(`[PushNotifications] No push tokens found for user ${userId}`);
                return false;
            }

            console.log(`[PushNotifications] Found ${tokens.length} tokens for user ${userId}`);

            const promises = tokens.map(async (row) => {
                try {
                    const subscription = JSON.parse(row.token);
                    const payload = JSON.stringify({
                        title,
                        body,
                        icon: icon || '/logo.svg',
                        data: {
                            url: url || '/dashboard/notifications',
                            ...data
                        }
                    });

                    await webpush.sendNotification(subscription, payload);
                    console.log(`[PushNotifications] Successfully sent to token for user ${userId}`);
                } catch (error) {
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        // Token expired or invalid, remove it
                        console.log('[PushNotifications] Removing expired/invalid token');
                        await db.run('DELETE FROM push_tokens WHERE token = ? AND user_id = ?', row.token, userId);
                    } else {
                        console.error('[PushNotifications] Send error for a token:', error.message || error);
                    }
                }
            });

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('[PushNotifications] Global send error:', error);
            return false;
        }
    }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
