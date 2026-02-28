/**
 * Plans Configuration for SEVEN T SaaS
 * Defines limits and features for each subscription plan
 * 
 * NOTE: Plans can now be managed from the admin panel.
 * This file provides the default fallback configuration.
 */

import db from '../database/init.js';

// Cache for database plans
let cachedPlans = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/** Baseline: all plan-gated features false; models []. DB is the single source of truth so modules not enabled for a plan are never exposed. */
const FEATURES_BASELINE = {
    availability_hours: false,
    voice_responses: false,
    payment_module: false,
    next_best_action: false,
    conversion_score: false,
    daily_briefing: false,
    sentiment_routing: false,
    catalog_import: false,
    human_handoff_alerts: false,
    models: []
};

/**
 * Load plans from database (async)
 * Features: baseline (all false) then DB only, so admin-unchecked modules stay off.
 */
async function loadPlansFromDB() {
    try {
        const now = Date.now();
        if (cachedPlans && (now - cacheTime) < CACHE_TTL) {
            return cachedPlans;
        }

        const dbPlans = await db.all(`
            SELECT * FROM subscription_plans 
            WHERE is_active = 1 
            ORDER BY sort_order ASC
        `);

        if (dbPlans && dbPlans.length > 0) {
            const plans = {};
            for (const plan of dbPlans) {
                const defaultLimits = (PLANS[plan.name] && PLANS[plan.name].limits) ? PLANS[plan.name].limits : {};
                const dbLimits = JSON.parse(plan.limits || '{}');
                const dbFeatures = JSON.parse(plan.features || '{}');
                plans[plan.name] = {
                    name: plan.name,
                    displayName: plan.display_name,
                    description: plan.description,
                    price: plan.price,
                    priceCurrency: plan.price_currency || 'XOF',
                    limits: { ...defaultLimits, ...dbLimits },
                    features: { ...FEATURES_BASELINE, ...dbFeatures }
                };
            }
            cachedPlans = plans;
            cacheTime = now;
            return plans;
        }
    } catch (error) {
        console.error('Error loading plans from DB:', error.message);
    }
    return null;
}

/**
 * Clear plans cache (call when plans are updated)
 */
export function clearPlansCache() {
    cachedPlans = null;
    cacheTime = 0;
}

/**
 * Get the name of the default active plan (is_default=1 and is_active=1).
 * Used when a user's plan is inactive so we don't give them the static config of a disabled plan.
 */
export async function getDefaultPlanName() {
    try {
        const row = await db.prepare(`
            SELECT name FROM subscription_plans 
            WHERE is_active = 1 AND is_default = 1 
            LIMIT 1
        `).get();
        return row?.name || 'free';
    } catch (e) {
        return 'free';
    }
}

/**
 * Plan name to show in API: if the given plan is inactive, returns the default plan name.
 * Use in GET /me etc. so the frontend always sees an active plan.
 */
export async function getEffectivePlanName(planName) {
    const dbPlans = await loadPlansFromDB();
    if (dbPlans && dbPlans[planName]) return planName;
    return await getDefaultPlanName();
}

// Default/Fallback plans configuration (aligned with config/defaultPlans.js)
export const PLANS = {
    free: {
        name: 'free',
        displayName: 'Gratuit',
        description: 'Découvrir la plateforme (sans WhatsApp)',
        price: 0,
        priceCurrency: 'XOF',
        limits: {
            agents: 1,
            whatsapp_accounts: 0,
            outlook_accounts: 0,
            conversations_per_month: 0,
            messages_per_month: 100,
            credits_per_month: 100,
            knowledge_items: 5,
            templates: 3
        },
        features: {
            models: ['gemini-1.5-flash'],
            availability_hours: false,
            voice_responses: false,
            payment_module: false,
            next_best_action: false,
            conversion_score: false,
            daily_briefing: false,
            sentiment_routing: false,
            catalog_import: false,
            human_handoff_alerts: false
        }
    },
    starter: {
        name: 'starter',
        displayName: 'Starter',
        description: 'Pour démarrer avec un numéro WhatsApp',
        price: 15000,
        priceCurrency: 'XOF',
        limits: {
            agents: 1,
            whatsapp_accounts: 1,
            outlook_accounts: 1,
            conversations_per_month: 300,
            messages_per_month: 1500,
            credits_per_month: 1500,
            knowledge_items: 25,
            templates: 15
        },
        features: {
            models: ['gemini-1.5-flash', 'gpt-4o-mini'],
            availability_hours: true,
            voice_responses: true,
            payment_module: false,
            next_best_action: false,
            conversion_score: false,
            daily_briefing: false,
            sentiment_routing: false,
            catalog_import: false,
            human_handoff_alerts: false
        }
    },
    pro: {
        name: 'pro',
        displayName: 'Pro',
        description: 'Pour les entreprises en croissance',
        price: 35000,
        priceCurrency: 'XOF',
        limits: {
            agents: 2,
            whatsapp_accounts: 2,
            outlook_accounts: 2,
            conversations_per_month: 1500,
            messages_per_month: 5000,
            credits_per_month: 5000,
            knowledge_items: 100,
            templates: 50
        },
        features: {
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true
        }
    },
    business: {
        name: 'business',
        displayName: 'Business',
        description: 'Pour les grandes équipes',
        price: 99000,
        priceCurrency: 'XOF',
        limits: {
            agents: 4,
            whatsapp_accounts: 4,
            outlook_accounts: 4,
            conversations_per_month: 5000,
            messages_per_month: 20000,
            credits_per_month: 20000,
            knowledge_items: 500,
            templates: 200
        },
        features: {
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true
        }
    },
    enterprise: {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Solution sur mesure',
        price: -1,
        priceCurrency: 'XOF',
        limits: {
            agents: -1,
            whatsapp_accounts: -1,
            outlook_accounts: -1,
            conversations_per_month: -1,
            messages_per_month: -1,
            credits_per_month: -1,
            knowledge_items: -1,
            templates: -1
        },
        features: {
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true
        }
    }
};

export const MODULE_KEYS = ['next_best_action', 'conversion_score', 'daily_briefing', 'sentiment_routing', 'catalog_import', 'human_handoff_alerts'];

/**
 * Check if a plan module is available (async)
 * @param {string} planName
 * @param {string} moduleKey - One of: next_best_action, conversion_score, daily_briefing, sentiment_routing, catalog_import, human_handoff_alerts
 * @returns {Promise<boolean>}
 */
export async function hasModule(planName, moduleKey) {
    const plan = await getPlan(planName);
    return plan.features[moduleKey] === true;
}

/**
 * Get plan configuration by name (async)
 * Only active plans from DB are used. If the requested plan is inactive or missing,
 * the default active plan (or free) is returned so users don't keep "pro" benefits when pro is disabled.
 */
export async function getPlan(planName) {
    const dbPlans = await loadPlansFromDB();
    if (dbPlans && dbPlans[planName]) {
        return dbPlans[planName];
    }
    // Plan désactivé ou inexistant : appliquer le plan par défaut (ou free), pas la config statique du plan désactivé
    const defaultName = await getDefaultPlanName();
    if (dbPlans && dbPlans[defaultName]) return dbPlans[defaultName];
    return PLANS[defaultName] || PLANS.free;
}

/**
 * Get all plans (from database or static) (async)
 */
export async function getAllPlans() {
    const dbPlans = await loadPlansFromDB();
    return dbPlans || PLANS;
}

/**
 * Check if a limit is reached (async)
 * @returns {boolean} true if limit is reached
 */
export async function isLimitReached(planName, limitType, currentCount) {
    const plan = await getPlan(planName);
    const limit = plan.limits[limitType];
    if (limit === -1) return false;
    return currentCount >= limit;
}

/**
 * Get remaining quota (async)
 * @returns {number} remaining count (-1 = unlimited)
 */
export async function getRemainingQuota(planName, limitType, currentCount) {
    const plan = await getPlan(planName);
    const limit = plan.limits[limitType];
    if (limit === -1) return -1;
    return Math.max(0, limit - currentCount);
}

/**
 * Check if a feature is available for a plan (async)
 */
export async function hasFeature(planName, featureName) {
    const plan = await getPlan(planName);
    return plan.features[featureName] === true;
}

/**
 * Check if a model is available for a plan (async)
 */
export async function isModelAvailable(planName, modelName) {
    const plan = await getPlan(planName);
    return plan.features.models.includes(modelName);
}

/**
 * Get available models for a plan (async)
 */
export async function getAvailableModels(planName) {
    const plan = await getPlan(planName);
    return plan.features.models;
}

export default PLANS;
