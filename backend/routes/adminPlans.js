/**
 * Admin Plans Routes
 * Routes for managing subscription plans from admin panel
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { clearPlansCache, getDefaultPlanName } from '../config/plans.js';
import { defaultPlans } from '../config/defaultPlans.js';
import { activityLogger } from '../services/activityLogger.js';

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
    reports: false,
    next_best_action: false,
    conversion_score: false,
    daily_briefing: false,
    sentiment_routing: false,
    catalog_import: false,
    human_handoff_alerts: false,
    analytics: false,
    polls_module: false
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
router.use(authenticateToken);

// The requirePermission('billing.plans.write') will be applied to specific route groups or individually
const requirePlans = requirePermission('billing.plans.write');

// ==================== PLANS CRUD ====================

/**
 * Get all subscription plans
 */
router.get('/plans', requirePlans, async (req, res) => {
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
router.post('/plans/restore-defaults', requirePlans, async (req, res) => {
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
router.get('/plans/:id', requirePlans, async (req, res) => {
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
router.post('/plans', requirePlans, async (req, res) => {
    try {
        const { 
            name, 
            display_name, 
            description, 
            price, 
            price_currency,
            billing_period,
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
            outlook_accounts: 0,
            google_calendar_accounts: 0,
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
                billing_period, limits, features, is_active, sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            planId,
            name.toLowerCase().replace(/\s+/g, '_'),
            display_name,
            description || '',
            price || 0,
            price_currency || 'FCFA',
            billing_period || 'monthly',
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

        await activityLogger.log({
            userId: req.user.id,
            action: 'create_plan',
            entityType: 'plan',
            entityId: planId,
            details: { name: plan.name, display_name: plan.display_name },
            req
        });

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
router.put('/plans/:id', requirePlans, async (req, res) => {
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

        // Calculate changes for logging
        const changes = {};
        const fieldsToTrack = ['display_name', 'price', 'is_active', 'billing_period', 'limits', 'features'];
        fieldsToTrack.forEach(field => {
            const oldValue = plan[field];
            const newValue = req.body[field] !== undefined ? (typeof req.body[field] === 'object' ? JSON.stringify(req.body[field]) : req.body[field]) : undefined;
            
            if (newValue !== undefined && String(oldValue) !== String(newValue)) {
                changes[field] = { old: oldValue, new: newValue };
            }
        });

        // Invalidate cache immediately
        clearPlansCache();

        await activityLogger.log({
            userId: req.user.id,
            action: 'update_plan',
            entityType: 'plan',
            entityId: req.params.id,
            details: { 
                name: updatedPlan.name,
                changes: Object.keys(changes).length > 0 ? changes : null
            },
            req
        });

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
router.delete('/plans/:id', requirePlans, async (req, res) => {
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

        await activityLogger.log({
            userId: req.user.id,
            action: 'delete_plan',
            entityType: 'plan',
            entityId: req.params.id,
            details: { name: plan.name },
            req
        });

        res.json({ message: 'Plan supprimé avec succès' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du plan' });
    }
});

/**
 * Set default plan
 */
router.post('/plans/:id/set-default', requirePlans, async (req, res) => {
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

        await activityLogger.log({
            userId: req.user.id,
            action: 'set_default_plan',
            entityType: 'plan',
            entityId: req.params.id,
            details: { name: plan.name },
            req
        });

        res.json({ message: `${plan.display_name} est maintenant le plan par défaut` });
    } catch (error) {
        console.error('Set default plan error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Duplicate a plan
 */
router.post('/plans/:id/duplicate', requirePlans, async (req, res) => {
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
router.post('/plans/reorder', requirePlans, async (req, res) => {
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
router.get('/plans/stats/overview', requirePlans, async (req, res) => {
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
router.get('/available-models', requirePlans, async (req, res) => {
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

/**
 * ==================== COUPONS CRUD ====================
 */

/**
 * Get all coupons
 */
router.get('/coupons', requirePlans, async (req, res) => {
    try {
        const coupons = await db.all(`
            SELECT c.*, u.name as influencer_name, u.email as influencer_email 
            FROM subscription_coupons c
            LEFT JOIN users u ON c.influencer_id = u.id
            ORDER BY c.created_at DESC
        `);
        res.json({ coupons: Array.isArray(coupons) ? coupons : [] });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Create a coupon
 */
router.post('/coupons', requirePlans, async (req, res) => {
    try {
        let { 
            name, code, discount_type, discount_value, max_uses, expires_at, is_active, 
            influencer_id, influencer_reward_type, influencer_reward_value,
            create_influencer, influencer_email, influencer_name // New fields for auto-creation
        } = req.body;
        
        if (!code || !discount_type || discount_value === undefined) {
            return res.status(400).json({ error: 'Code, type de réduction et valeur requis' });
        }

        code = code.trim().toUpperCase();
        const existing = await db.get('SELECT id FROM subscription_coupons WHERE code = ?', code);
        if (existing) {
            return res.status(400).json({ error: 'Ce code de coupon existe déjà' });
        }

        let finalInfluencerId = influencer_id || null;
        let tempInfluencerPassword = null;

        // Auto-create influencer account if requested
        if (create_influencer && influencer_email && influencer_name) {
            const userExists = await db.get('SELECT id FROM users WHERE email = ?', influencer_email.toLowerCase().trim());
            if (userExists) {
                finalInfluencerId = userExists.id;
            } else {
                const userId = uuidv4();
                const bcrypt = await import('bcryptjs');
                const tempPassword = Math.random().toString(36).slice(-10);
                const hashedPassword = await bcrypt.default.hash(tempPassword, 10);
                
                await db.run(`
                    INSERT INTO users (id, name, email, password, plan, credits, subscription_status)
                    VALUES (?, ?, ?, ?, 'free', 0, 'active')
                `, userId, influencer_name, influencer_email.toLowerCase().trim(), hashedPassword);

                // Assign influencer role
                const influencerRole = await db.get("SELECT id FROM roles WHERE key = 'influencer'");
                if (influencerRole) {
                    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', userId, influencerRole.id);
                }
                
                finalInfluencerId = userId;
                tempInfluencerPassword = tempPassword;
                console.log(`[Coupons] Influencer created: ${influencer_email} / Temp pass: ${tempPassword}`);
            }
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO subscription_coupons (id, name, code, discount_type, discount_value, max_uses, expires_at, is_active, influencer_id, influencer_reward_type, influencer_reward_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, id, name || null, code, discount_type, discount_value, max_uses || null, expires_at || null, is_active !== false ? 1 : 0, finalInfluencerId, influencer_reward_type || 'none', influencer_reward_value || 0);

        const coupon = await db.get('SELECT * FROM subscription_coupons WHERE id = ?', id);

        await activityLogger.log({
            userId: req.user.id,
            action: 'create_coupon',
            entityType: 'coupon',
            entityId: id,
            details: { code: coupon.code, value: coupon.discount_value },
            req
        });

        res.status(201).json({ 
            message: 'Coupon créé avec succès', 
            coupon,
            tempInfluencerPassword
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: 'Erreur lors de la création du coupon' });
    }
});

router.get('/coupons/:id', requirePlans, async (req, res) => {
    try {
        const coupon = await db.get(`
            SELECT c.*, u.name as influencer_name, u.email as influencer_email 
            FROM subscription_coupons c
            LEFT JOIN users u ON c.influencer_id = u.id
            WHERE c.id = ?
        `, req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });
        res.json({ coupon });
    } catch (error) {
        console.error('Get coupon error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Update a coupon
 */
router.put('/coupons/:id', requirePlans, async (req, res) => {
    try {
        const { name, code, discount_type, discount_value, max_uses, expires_at, is_active, influencer_id, influencer_reward_type, influencer_reward_value } = req.body;
        
        const coupon = await db.get('SELECT * FROM subscription_coupons WHERE id = ?', req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name || null); }
        if (code) {
            const formattedCode = code.trim().toUpperCase();
            const existing = await db.get('SELECT id FROM subscription_coupons WHERE code = ? AND id != ?', formattedCode, req.params.id);
            if (existing) return res.status(400).json({ error: 'Ce code est déjà utilisé' });
            updates.push('code = ?'); params.push(formattedCode);
        }
        if (discount_type) { updates.push('discount_type = ?'); params.push(discount_type); }
        if (discount_value !== undefined) { updates.push('discount_value = ?'); params.push(discount_value); }
        if (max_uses !== undefined) { updates.push('max_uses = ?'); params.push(max_uses || null); }
        if (expires_at !== undefined) { updates.push('expires_at = ?'); params.push(expires_at || null); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
        if (influencer_id !== undefined) { updates.push('influencer_id = ?'); params.push(influencer_id || null); }
        if (influencer_reward_type !== undefined) { updates.push('influencer_reward_type = ?'); params.push(influencer_reward_type); }
        if (influencer_reward_value !== undefined) { updates.push('influencer_reward_value = ?'); params.push(influencer_reward_value); }

        if (updates.length > 0) {
            params.push(req.params.id);
            await db.run(`UPDATE subscription_coupons SET ${updates.join(', ')} WHERE id = ?`, ...params);
        }

        const updatedCoupon = await db.get('SELECT * FROM subscription_coupons WHERE id = ?', req.params.id);

        // Calculate changes
        const changes = {};
        const fieldsToTrack = ['name', 'code', 'discount_value', 'is_active', 'max_uses'];
        fieldsToTrack.forEach(field => {
            if (req.body[field] !== undefined && String(coupon[field]) !== String(req.body[field])) {
                changes[field] = { old: coupon[field], new: req.body[field] };
            }
        });

        await activityLogger.log({
            userId: req.user.id,
            action: 'update_coupon',
            entityType: 'coupon',
            entityId: req.params.id,
            details: { 
                code: updatedCoupon.code,
                changes: Object.keys(changes).length > 0 ? changes : 'Configuration update'
             },
            req
        });

        res.json({ message: 'Coupon mis à jour', coupon: updatedCoupon });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Delete a coupon
 */
router.delete('/coupons/:id', requirePlans, async (req, res) => {
    try {
        const coupon = await db.get('SELECT * FROM subscription_coupons WHERE id = ?', req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });

        await db.run('DELETE FROM subscription_coupons WHERE id = ?', req.params.id);

        await activityLogger.log({
            userId: req.user.id,
            action: 'delete_coupon',
            entityType: 'coupon',
            entityId: req.params.id,
            details: { code: coupon.code },
            req
        });

        res.json({ message: 'Coupon supprimé' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


export default router;
