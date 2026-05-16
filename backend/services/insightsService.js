import db from '../database/init.js';
import { aiService } from './ai.js';
import { notificationService } from './notifications.js';
import { v4 as uuidv4 } from 'uuid';

class InsightsService {
    /**
     * Entry point for background job to analyze all users
     */
    async runInsightsJob() {
        console.log('[Insights] Running Social Listening analysis job...');
        try {
            // Find users who haven't had insights in the last 24h
            const users = await db.all(`
                SELECT id FROM users 
                WHERE is_active = 1 
                AND (last_insights_at IS NULL OR last_insights_at < NOW() - INTERVAL '1 day')
            `);

            for (const user of users) {
                await this.generateInsightsForUser(user.id);
            }
        } catch (error) {
            console.error('[Insights] Job failed:', error.message);
        }
    }

    /**
     * Generates a "Social Listening" report for a single user
     */
    async generateInsightsForUser(userId) {
        try {
            console.log(`[Insights] Analyzing conversations for user: ${userId}`);

            // 1. Fetch recent messages (last 100 per user across all agents)
            const messages = await db.all(`
                SELECT m.role, m.content, c.id as conversation_id, c.contact_name
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? 
                AND m.created_at >= NOW() - INTERVAL '7 days'
                ORDER BY m.created_at DESC
                LIMIT 200
            `, userId);

            if (!messages || messages.length < 2) {
                console.log(`[Insights] Not enough data for user ${userId}`);
                return null;
            }

            // 2. Call AI Service for summary
            const analysis = await aiService.analyzeSocialInsights(messages, userId);
            
            if (!analysis) return;

            // 3. Store result in insights table
            const insightId = uuidv4();
            await db.run(`
                INSERT INTO insights (id, user_id, type, content)
                VALUES (?, ?, 'weekly_synthesis', ?)
            `, insightId, userId, JSON.stringify(analysis));

            // 4. Update user last_insights_at
            await db.run('UPDATE users SET last_insights_at = CURRENT_TIMESTAMP WHERE id = ?', userId);

            // 5. Notify user
            await notificationService.create({
                userId,
                type: 'success',
                title: 'Nouveaux Insights Disponibles',
                message: 'Votre rapport Social Listening hebdomadaire est prêt ! Consultez les tendances et frictions identifiées par l\'IA.',
                link: '/analytics'
            });

            console.log(`[Insights] Successfully generated insights for user ${userId}`);
            return analysis;

        } catch (error) {
            console.error(`[Insights] Failed for user ${userId}:`, error.message);
        }
    }

    /**
     * Get latest insights for a user
     */
    async getLatestInsights(userId) {
        return await db.get(`
            SELECT * FROM insights 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, userId);
    }
}

export const insightsService = new InsightsService();
export default insightsService;
