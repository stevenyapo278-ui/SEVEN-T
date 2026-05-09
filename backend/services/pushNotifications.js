/**
 * Push Notification Service
 * Manages Web Push notifications using web-push
 */

import webpush from 'web-push';
import db from '../database/init.js';

// VAPID keys should ideally be in environment variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BDNFr-Q3QLvI-YyRbPhakFq4XvjXS_-KBZf_pLPIreNWexzknC6ehXcFz8lsrozQU6SH7Y69032JE5lpGoUr-OM';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'aKCVK7D4Aa0ifHMrO2KmYb8QxQcfylFQlyvJrftbS9M';

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
            const tokens = await db.all('SELECT token FROM push_tokens WHERE user_id = ?', userId);
            
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
                } catch (error) {
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        // Token expired or invalid, remove it
                        console.log('[PushNotifications] Removing expired token');
                        await db.run('DELETE FROM push_tokens WHERE token = ?', row.token);
                    } else {
                        console.error('[PushNotifications] Send error:', error);
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
