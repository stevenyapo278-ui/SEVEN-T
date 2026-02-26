import db from '../database/init.js';
import { hasModule } from '../config/plans.js';

/**
 * Middleware: require a plan module to be enabled for the current user.
 * Use after authenticateToken. On failure returns 403 with message.
 * @param {string} moduleKey - One of: next_best_action, conversion_score, daily_briefing, sentiment_routing, catalog_import, multi_brand, whatsapp_flows
 */
export function requireModule(moduleKey) {
    return async (req, res, next) => {
        try {
            const user = await db.get('SELECT plan FROM users WHERE id = ?', req.user.id);
            const planName = user?.plan || 'free';
            const allowed = await hasModule(planName, moduleKey);
            if (!allowed) {
                return res.status(403).json({
                    error: 'Module non disponible',
                    code: 'MODULE_NOT_INCLUDED',
                    module: moduleKey
                });
            }
            req.userPlan = planName;
            next();
        } catch (e) {
            console.error('requireModule error:', e?.message);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    };
}
