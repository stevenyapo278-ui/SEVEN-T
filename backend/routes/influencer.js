import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { userHasPermission } from '../services/rbac.js';

const router = Router();

// Middleware to ensure user is an influencer
const isInfluencer = async (req, res, next) => {
    try {
        // Fetch permissions from DB (more reliable than role key check if roles aren't perfectly synced)
        const roles = await db.all(`
            SELECT r.key FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ?
        `, req.user.id);
        
        const isInfluencerRole = roles.some(r => r.key === 'influencer' || r.key === 'owner' || r.key === 'admin');
        
        if (!isInfluencerRole && !req.user.is_admin) {
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
        `, req.user.id);

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

        const stats = coupons.map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            discount: `${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' FCFA'}`,
            usages: usageMap.get(c.id)?.count || 0,
            revenue: usageMap.get(c.id)?.revenue || 0,
            is_active: c.is_active,
            reward_type: c.influencer_reward_type,
            reward_value: c.influencer_reward_value,
            accumulated_reward: (usageMap.get(c.id)?.count || 0) * (c.influencer_reward_value || 0)
        }));

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
        `, req.user.id);

        res.json({ usages });
    } catch (error) {
        console.error('Influencer usages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
