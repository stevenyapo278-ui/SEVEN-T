/**
 * Admin Plans Routes
 * Routes for managing subscription plans from admin panel
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { clearPlansCache, getDefaultPlanName } from '../config/plans.js';
import { defaultPlans } from '../config/defaultPlans.js';

const router = Router();

/** Safely parse JSON field; handles undefined, null, '' and literal "undefined" string */
function parsePlanJson(val, fallback = '{}') {
    if (val == null || val === '' || val === 'undefined') return fallback;
    return val;
}

/** All feature keys (including modules 3–7) so API always returns them */
const ALL_FEATURE_KEYS = {
    availability_hours: false,
    voice_responses: false,
    payment_module: false,
    next_best_action: false,
    conversion_score: false,
    daily_briefing: false,
    sentiment_routing: false,
    catalog_import: false
};

/** Merge DB limits/features with default plan so keys like modules 3–7 are always present */
function mergeWithDefaults(plan) {
    const defaultPlan = defaultPlans.find(p => p.name === plan.name);
    const defaultLimits = defaultPlan?.limits ? JSON.parse(defaultPlan.limits) : {};
    const defaultFeatures = defaultPlan?.features ? JSON.parse(defaultPlan.features) : {};
    const parsedFeatures = plan.features && typeof plan.features === 'object' ? plan.features : JSON.parse(plan.features || '{}');
    return {
        ...plan,
        limits: { ...defaultLimits, ...(plan.limits && typeof plan.limits === 'object' ? plan.limits : JSON.parse(plan.limits || '{}')) },
        features: { ...ALL_FEATURE_KEYS, ...defaultFeatures, ...parsedFeatures }
    };
}

// All routes require admin
router.use(authenticateToken, requireAdmin);

// ==================== PLANS CRUD ====================

/**
 * Get all subscription plans
 */
router.get('/plans', async (req, res) => {
    try {
        const plans = await db.all(`
            SELECT * FROM subscription_plans
            ORDER BY sort_order ASC
        `);

        const list = Array.isArray(plans) ? plans : [];
        const parsedPlans = list.map(plan => {
            const parsed = {
                ...plan,
                limits: JSON.parse(plan.limits || '{}'),
                features: JSON.parse(plan.features || '{}')
            };
            return mergeWithDefaults(parsed);
        });

        const userCounts = await db.all(`
            SELECT plan, COUNT(*) as count
            FROM users
            GROUP BY plan
        `);

        const countMap = {};
        userCounts.forEach(u => { countMap[u.plan] = u.count; });

        parsedPlans.forEach(plan => {
            plan.user_count = countMap[plan.name] || 0;
        });

        res.json({ plans: parsedPlans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Restore default plans (delete all and re-insert from config)
 */
router.post('/plans/restore-defaults', async (req, res) => {
    try {
        await db.prepare('DELETE FROM subscription_plans').run();

        const insertPlan = db.prepare(`
            INSERT INTO subscription_plans (id, name, display_name, description, price, sort_order, is_default, limits, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const plan of defaultPlans) {
            await insertPlan.run(plan.id, plan.name, plan.display_name, plan.description, plan.price, plan.sort_order, plan.is_default || 0, plan.limits, plan.features);
        }

        clearPlansCache();

        res.json({ message: 'Plans par défaut restaurés', count: defaultPlans.length });
    } catch (error) {
        console.error('Restore default plans error:', error);
        res.status(500).json({ error: 'Erreur lors de la restauration des plans' });
    }
});

/**
 * Get a single plan by ID
 */
router.get('/plans/:id', async (req, res) => {
    try {
        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }

        // Parse JSON fields and merge with defaults
        plan.limits = JSON.parse(plan.limits || '{}');
        plan.features = JSON.parse(plan.features || '{}');
        const merged = mergeWithDefaults(plan);
        plan.limits = merged.limits;
        plan.features = merged.features;

        // Get user count for this plan
        const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE plan = ?').get(plan.name);
        plan.user_count = userCount?.count || 0;

        res.json({ plan });
    } catch (error) {
        console.error('Get plan error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Create a new plan
 */
router.post('/plans', async (req, res) => {
    try {
        const { 
            name, 
            display_name, 
            description, 
            price, 
            price_currency,
            billing_period,
            stripe_price_id,
            limits, 
            features,
            is_active,
            sort_order
        } = req.body;

        if (!name || !display_name) {
            return res.status(400).json({ error: 'Nom et nom d\'affichage requis' });
        }

        // Check if plan name already exists
        const existing = await db.prepare('SELECT id FROM subscription_plans WHERE name = ?').get(name);
        if (existing) {
            return res.status(400).json({ error: 'Un plan avec ce nom existe déjà' });
        }

        const planId = uuidv4();
        
        // Default limits and features
        const defaultLimits = {
            agents: 1,
            whatsapp_accounts: 1,
            conversations_per_month: 100,
            messages_per_month: 500,
            credits_per_month: 500,
            knowledge_items: 10,
            templates: 5
        };

        const defaultFeatures = {
            models: ['gemini-1.5-flash'],
            availability_hours: false,
            voice_responses: false,
            payment_module: false,
            next_best_action: false,
            conversion_score: false,
            daily_briefing: false,
            sentiment_routing: false,
            catalog_import: false
        };

        await db.prepare(`
            INSERT INTO subscription_plans (
                id, name, display_name, description, price, price_currency, 
                billing_period, stripe_price_id, limits, features, is_active, sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            planId,
            name.toLowerCase().replace(/\s+/g, '_'),
            display_name,
            description || '',
            price || 0,
            price_currency || 'FCFA',
            billing_period || 'monthly',
            stripe_price_id || null,
            JSON.stringify(limits || defaultLimits),
            JSON.stringify(features || defaultFeatures),
            is_active !== false ? 1 : 0,
            sort_order || 99
        );

        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId);
        plan.limits = JSON.parse(parsePlanJson(plan.limits, '{}'));
        plan.features = JSON.parse(parsePlanJson(plan.features, '[]'));

        // Invalidate cache immediately
        clearPlansCache();

        res.status(201).json({ 
            message: 'Plan créé avec succès',
            plan 
        });
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Erreur lors de la création du plan' });
    }
});

/**
 * Update a plan
 */
router.put('/plans/:id', async (req, res) => {
    try {
        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }

        const { 
            display_name, 
            description, 
            price, 
            price_currency,
            billing_period,
            stripe_price_id,
            limits, 
            features,
            is_active,
            sort_order
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (display_name !== undefined) {
            updates.push('display_name = ?');
            params.push(display_name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            params.push(price);
        }
        if (price_currency !== undefined) {
            updates.push('price_currency = ?');
            params.push(price_currency);
        }
        if (billing_period !== undefined) {
            updates.push('billing_period = ?');
            params.push(billing_period);
        }
        if (stripe_price_id !== undefined) {
            updates.push('stripe_price_id = ?');
            params.push(stripe_price_id || null);
        }
        if (limits !== undefined) {
            updates.push('limits = ?');
            params.push(JSON.stringify(limits));
        }
        if (features !== undefined) {
            updates.push('features = ?');
            // Toujours enregistrer un objet complet (baseline + reçu) pour que les modules désactivés (false) soient bien persistés
            const merged = { ...ALL_FEATURE_KEYS, models: [], ...(features && typeof features === 'object' ? features : {}) };
            if (!Array.isArray(merged.models)) merged.models = features?.models ?? [];
            params.push(JSON.stringify(merged));
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }
        if (sort_order !== undefined) {
            updates.push('sort_order = ?');
            params.push(sort_order);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.params.id);

        await db.prepare(`
            UPDATE subscription_plans 
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...params);

        // Si le plan vient d'être désactivé : migrer les utilisateurs vers le plan par défaut
        if (is_active === false || is_active === 0) {
            const defaultPlanName = await getDefaultPlanName();
            if (defaultPlanName && defaultPlanName !== plan.name) {
                const result = await db.prepare('UPDATE users SET plan = ? WHERE plan = ?').run(defaultPlanName, plan.name);
                if (result.rowCount > 0) {
                    console.log(`[adminPlans] Plan "${plan.name}" désactivé : ${result.rowCount} utilisateur(s) migré(s) vers "${defaultPlanName}".`);
                }
            }
        }

        const updatedPlan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        updatedPlan.limits = JSON.parse(parsePlanJson(updatedPlan.limits, '{}'));
        updatedPlan.features = JSON.parse(parsePlanJson(updatedPlan.features, '[]'));

        // Invalidate cache immediately
        clearPlansCache();

        res.json({ 
            message: 'Plan mis à jour',
            plan: updatedPlan 
        });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du plan' });
    }
});

/**
 * Delete a plan
 */
router.delete('/plans/:id', async (req, res) => {
    try {
        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }

        // Check if users are using this plan
        const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE plan = ?').get(plan.name);
        
        if (userCount.count > 0) {
            return res.status(400).json({ 
                error: `Impossible de supprimer ce plan : ${userCount.count} utilisateur(s) l'utilisent encore`,
                user_count: userCount.count
            });
        }

        // Prevent deletion of default plan
        if (plan.is_default) {
            return res.status(400).json({ 
                error: 'Impossible de supprimer le plan par défaut'
            });
        }

        await db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(req.params.id);

        // Invalidate cache immediately
        clearPlansCache();

        res.json({ message: 'Plan supprimé avec succès' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du plan' });
    }
});

/**
 * Set default plan
 */
router.post('/plans/:id/set-default', async (req, res) => {
    try {
        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }

        // Remove default from all plans
        await db.prepare('UPDATE subscription_plans SET is_default = 0').run();
        
        // Set this plan as default
        await db.prepare('UPDATE subscription_plans SET is_default = 1 WHERE id = ?').run(req.params.id);

        // Invalidate cache immediately
        clearPlansCache();

        res.json({ message: `${plan.display_name} est maintenant le plan par défaut` });
    } catch (error) {
        console.error('Set default plan error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Duplicate a plan
 */
router.post('/plans/:id/duplicate', async (req, res) => {
    try {
        const plan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }

        const newId = uuidv4();
        const newName = `${plan.name}_copy_${Date.now()}`;
        
        await db.prepare(`
            INSERT INTO subscription_plans (
                id, name, display_name, description, price, price_currency,
                billing_period, limits, features, is_active, is_default, sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
            newId,
            newName,
            `${plan.display_name} (copie)`,
            plan.description,
            plan.price,
            plan.price_currency,
            plan.billing_period,
            JSON.stringify(plan.limits),
            JSON.stringify(plan.features),
            0, // Start as inactive
            (plan.sort_order || 0) + 1
        );

        const newPlan = await db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(newId);
        newPlan.limits = JSON.parse(parsePlanJson(newPlan.limits, '{}'));
        newPlan.features = JSON.parse(parsePlanJson(newPlan.features, '[]'));

        // Invalidate cache immediately
        clearPlansCache();

        res.status(201).json({ 
            message: 'Plan dupliqué avec succès',
            plan: newPlan 
        });
    } catch (error) {
        console.error('Duplicate plan error:', error);
        res.status(500).json({ error: 'Erreur lors de la duplication du plan' });
    }
});

/**
 * Reorder plans
 */
router.post('/plans/reorder', async (req, res) => {
    try {
        const { order } = req.body; // Array of { id, sort_order }
        
        if (!Array.isArray(order)) {
            return res.status(400).json({ error: 'Format invalide' });
        }

        const updateOrder = db.prepare('UPDATE subscription_plans SET sort_order = ? WHERE id = ?');
        
        for (const item of order) {
            await updateOrder.run(item.sort_order, item.id);
        }

        // Invalidate cache immediately
        clearPlansCache();

        res.json({ message: 'Ordre mis à jour' });
    } catch (error) {
        console.error('Reorder plans error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Get plan statistics
 */
router.get('/plans/stats/overview', async (req, res) => {
    try {
        // Total revenue by plan
        const revenue = await db.prepare(`
            SELECT 
                u.plan,
                COUNT(*) as user_count,
                p.price,
                p.display_name
            FROM users u
            LEFT JOIN subscription_plans p ON p.name = u.plan
            WHERE u.plan != 'free'
            GROUP BY u.plan, p.price, p.display_name
        `).all();

        // User distribution
        const distribution = await db.prepare(`
            SELECT 
                plan,
                COUNT(*) as count
            FROM users
            GROUP BY plan
        `).all();

        // Recent plan changes
        const recentChanges = await db.prepare(`
            SELECT 
                u.id,
                u.email,
                u.plan,
                u.updated_at
            FROM users u
            ORDER BY u.updated_at DESC
            LIMIT 10
        `).all();

        const totalPlans = await db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get();
        const activePlans = await db.prepare('SELECT COUNT(*) as count FROM subscription_plans WHERE is_active = 1').get();

        res.json({
            revenue: Array.isArray(revenue) ? revenue : [],
            distribution: Array.isArray(distribution) ? distribution : [],
            recentChanges: Array.isArray(recentChanges) ? recentChanges : [],
            total_plans: totalPlans?.count || 0,
            active_plans: activePlans?.count || 0
        });
    } catch (error) {
        console.error('Get plan stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Get available AI models for plans (list used in PlanModal "Modèles IA")
 */
router.get('/available-models', async (req, res) => {
    try {
        const models = await db.all(`
            SELECT id, name, provider, description, is_free
            FROM ai_models
            WHERE is_active = 1
            ORDER BY sort_order ASC
        `);
        res.json({ models: Array.isArray(models) ? models : [] });
    } catch (error) {
        console.error('Get available models error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
