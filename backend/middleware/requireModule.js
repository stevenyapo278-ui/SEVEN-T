import db from '../database/init.js';
import { hasModule, MODULE_TO_USER_COLUMN } from '../config/plans.js';

/**
 * Middleware: require a plan module to be enabled for the current user.
 * Checks plan feature OR user-level admin override.
 * Use after authenticateToken. On failure returns 403 with message.
 * @param {string} moduleKey - One of: next_best_action, conversion_score, daily_briefing, sentiment_routing, catalog_import, etc.
 */
export function requireModule(moduleKey) {
    return async (req, res, next) => {
        try {
            const userCol = MODULE_TO_USER_COLUMN[moduleKey];
            const selectCols = userCol ? `plan, ${userCol}` : 'plan';
            const user = await db.get(`SELECT ${selectCols}, parent_user_id FROM users WHERE id = ?`, req.user.id);
            const planName = user?.plan || 'free';
            const userOverride = userCol && (user?.[userCol] === 1 || user?.[userCol] === true);

            let allowed = false;

            if (user?.parent_user_id) {
                // If manager, MUST have owner's permission (owner's plan or owner's override)
                // AND must have their own override (delegated permission)
                const owner = await db.get(`SELECT ${selectCols} FROM users WHERE id = ?`, user.parent_user_id);
                const ownerPlanHas = owner ? await hasModule(owner.plan || 'free', moduleKey) : false;
                const ownerOverride = userCol && (owner?.[userCol] === 1 || owner?.[userCol] === true);
                
                const ownerAllowed = ownerPlanHas || ownerOverride;
                
                // Manager is allowed ONLY if owner is allowed AND manager has explicit override
                allowed = ownerAllowed && userOverride;
            } else {
                // For regular owners/admins
                const planHas = await hasModule(planName, moduleKey);
                allowed = planHas || userOverride;
            }

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
