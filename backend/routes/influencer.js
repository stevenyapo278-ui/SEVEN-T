import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { userHasPermission } from '../services/rbac.js';

const router = Router();

// Middleware to ensure user is an influencer
const isInfluencer = async (req, res, next) => {
    try {
        // Check for specific permission or general admin status
        const canAccess = await userHasPermission(req.user.ownerId, 'influencer.dashboard');
        
        if (!canAccess && !req.user.is_admin) {
            return res.status(403).json({ error: 'Accès réservé aux influenceurs' });
        }
        next();
    } catch (error) {
        console.error('isInfluencer middleware error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

router.use(authenticateToken, isInfluencer);

/**
 * Get influencer overview (stats for all their coupons)
 */
router.get('/stats', async (req, res) => {
    try {
        const coupons = await db.all(`
            SELECT * FROM subscription_coupons 
            WHERE influencer_id = ?
        `, req.user.ownerId);

        if (coupons.length === 0) {
            return res.json({
                total_usages: 0,
                active_coupons: 0,
                stats: []
            });
        }

        const couponIds = coupons.map(c => c.id);
        const placeholders = couponIds.map(() => '?').join(',');

        const usages = await db.all(`
            SELECT coupon_id, COUNT(*) as count, SUM(amount_total) as revenue
            FROM coupon_usages
            WHERE coupon_id IN (${placeholders})
            GROUP BY coupon_id
        `, ...couponIds);

        const usageMap = new Map(usages.map(u => [u.coupon_id, u]));

        const stats = coupons.map(c => {
            const usage = usageMap.get(c.id) || { count: 0, revenue: 0 };
            let accumulatedReward = 0;

            if (c.influencer_reward_type === 'percentage') {
                accumulatedReward = (usage.revenue || 0) * ((c.influencer_reward_value || 0) / 100);
            } else if (c.influencer_reward_type === 'fixed') {
                accumulatedReward = (usage.count || 0) * (c.influencer_reward_value || 0);
            }

            return {
                id: c.id,
                code: c.code,
                name: c.name,
                discount: `${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' FCFA'}`,
                usages: usage.count,
                revenue: usage.revenue || 0,
                is_active: c.is_active,
                reward_type: c.influencer_reward_type,
                reward_value: c.influencer_reward_value,
                accumulated_reward: accumulatedReward
            };
        });

        const totalUsages = stats.reduce((acc, s) => acc + s.usages, 0);
        const totalAccumulated = stats.reduce((acc, s) => acc + s.accumulated_reward, 0);

        res.json({
            total_usages: totalUsages,
            total_reward: totalAccumulated,
            active_coupons: coupons.filter(c => c.is_active).length,
            stats
        });
    } catch (error) {
        console.error('Influencer stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Get detailed usage log for their coupons
 */
router.get('/usages', async (req, res) => {
    try {
        const usages = await db.all(`
            SELECT u.created_at, u.amount_total, u.discount_amount, c.code as coupon_code
            FROM coupon_usages u
            JOIN subscription_coupons c ON u.coupon_id = c.id
            WHERE c.influencer_id = ?
            ORDER BY u.created_at DESC
            LIMIT 100
        `, req.user.ownerId);

        res.json({ usages });
    } catch (error) {
        console.error('Influencer usages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
