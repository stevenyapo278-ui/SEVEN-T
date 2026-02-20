/**
 * Credits Management Service for SEVEN T SaaS
 * Handles credit deduction, checking, and usage tracking
 */

import db from '../database/init.js';
import { getPlan } from '../config/plans.js';
import { notificationService } from './notifications.js';
import { adminAnomaliesService } from './adminAnomalies.js';

// Credit costs per action
export const CREDIT_COSTS = {
    // AI message generation - Google Gemini
    'gemini-1.5-flash': 1,
    'gemini-1.5-flash-latest': 1,
    'gemini-2.0-flash': 1,
    'gemini-1.5-pro': 2,
    'gemini-1.5-pro-latest': 2,
    
    // AI message generation - OpenAI
    'gpt-4o-mini': 2,
    'gpt-4o': 5,
    'gpt-4-turbo': 8,
    
    // AI message generation - OpenRouter (modèles gratuits)
    'meta-llama/llama-3.1-8b-instruct:free': 0,
    'meta-llama/llama-3.2-3b-instruct:free': 0,
    'google/gemma-2-9b-it:free': 0,
    'qwen/qwen-2-7b-instruct:free': 0,
    'qwen/qwen3-next-80b-a3b-instruct:free': 0, // Qwen 3 Next 80B
    'microsoft/phi-3-mini-128k-instruct:free': 0,
    'huggingfaceh4/zephyr-7b-beta:free': 0,
    'tngtech/deepseek-r1t-chimera:free': 0,
    
    // AI message generation - OpenRouter (modèles payants économiques)
    'meta-llama/llama-3.1-70b-instruct': 1,
    'meta-llama/llama-3.1-405b-instruct': 3,
    'mistralai/mistral-7b-instruct': 1,
    'mistralai/mixtral-8x7b-instruct': 1,
    'mistralai/mistral-large': 2,
    
    // AI message generation - OpenRouter (modèles premium)
    'anthropic/claude-3.5-sonnet': 3,
    'anthropic/claude-3-opus': 8,
    'anthropic/claude-3-haiku': 1,
    'openai/gpt-4o': 5,
    'openai/gpt-4o-mini': 2,
    'google/gemini-pro-1.5': 2,
    'google/gemini-flash-1.5': 1,
    
    // Fallback
    'fallback': 0, // Free fallback responses
    
    // 1 credit = 1 AI reply (used by ai.js for all models)
    'ai_message': 1,
    
    // Other actions
    'whatsapp_message_sent': 0.1,
    'knowledge_item_add': 0,
    'template_use': 0,
};

/**
 * Get user's current credits
 */
export async function getUserCredits(userId) {
    const user = await db.get('SELECT credits, plan FROM users WHERE id = ?', userId);
    if (!user) return null;
    return {
        credits: user.credits,
        plan: user.plan
    };
}

/**
 * Get the credit cost for a model/action
 */
export function getCreditCost(action) {
    // Direct match
    if (CREDIT_COSTS[action] !== undefined) {
        return CREDIT_COSTS[action];
    }
    
    // Free OpenRouter models (contain ":free")
    if (action?.includes(':free')) {
        return 0;
    }
    
    // Default cost for unknown models
    return 1;
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(userId, action, quantity = 1) {
    const user = await getUserCredits(userId);
    if (!user) return false;
    
    const plan = await getPlan(user.plan);
    
    // Enterprise plan has unlimited credits
    if (plan.limits.credits_per_month === -1) {
        return true;
    }
    
    const cost = getCreditCost(action) * quantity;
    return user.credits >= cost;
}

/**
 * Deduct credits from user
 * Returns true if successful, false if not enough credits
 * Uses atomic UPDATE with WHERE condition to prevent race conditions
 */
export async function deductCredits(userId, action, quantity = 1, metadata = {}) {
    const user = await getUserCredits(userId);
    if (!user) return { success: false, error: 'User not found' };
    
    const plan = await getPlan(user.plan);
    
    // Enterprise plan doesn't deduct credits
    if (plan.limits.credits_per_month === -1) {
        await logCreditUsage(userId, action, 0, metadata);
        return { success: true, credits_remaining: -1, cost: 0 };
    }
    
    const cost = Math.ceil(getCreditCost(action) * quantity);
    
    const result = await db.run(
        'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?',
        cost, userId, cost
    );
    
    if (result.rowCount === 0) {
        const currentUser = await getUserCredits(userId);
        return { 
            success: false, 
            error: 'Crédits insuffisants',
            credits_remaining: currentUser?.credits || 0,
            cost_required: cost
        };
    }
    
    await logCreditUsage(userId, action, cost, metadata);
    
    const updatedUser = await getUserCredits(userId);
    const newCredits = updatedUser.credits;
    
    const thresholds = [50, 20, 10, 5];
    for (const threshold of thresholds) {
        if (user.credits > threshold && newCredits <= threshold) {
            notificationService.notifyLowCredits(userId, newCredits);
            break;
        }
    }
    
    if (user.credits > 0 && newCredits <= 0) {
        const userInfo = await db.get('SELECT name FROM users WHERE id = ?', userId);
        adminAnomaliesService.logCreditsZero(userId, userInfo?.name || 'Utilisateur');
    }
    
    return { success: true, credits_remaining: newCredits, cost };
}

/**
 * Add credits to user (for purchases, refills, etc.)
 */
export async function addCredits(userId, amount, reason = 'purchase') {
    const user = await getUserCredits(userId);
    if (!user) return { success: false, error: 'User not found' };
    
    await db.run('UPDATE users SET credits = credits + ? WHERE id = ?', amount, userId);
    await logCreditUsage(userId, `credit_add_${reason}`, -amount, { reason });
    
    return { 
        success: true, 
        credits_added: amount,
        credits_remaining: user.credits + amount
    };
}

/**
 * Log credit usage for analytics (credit_usage table created in init.js)
 */
async function logCreditUsage(userId, action, amount, metadata = {}) {
    try {
        await db.run(`
            INSERT INTO credit_usage (user_id, action, amount, metadata)
            VALUES (?, ?, ?, ?)
        `, userId, action, amount, JSON.stringify(metadata));
    } catch (error) {
        console.error('Error logging credit usage:', error);
    }
}

/**
 * Get credit usage history for a user
 */
export async function getCreditUsageHistory(userId, days = 30) {
    try {
        return await db.all(`
            SELECT action, SUM(amount)::integer as total, COUNT(*)::integer as count, (created_at::date)::text as date
            FROM credit_usage
            WHERE user_id = ? AND created_at >= CURRENT_DATE - (?)::integer * INTERVAL '1 day'
            GROUP BY action, created_at::date
            ORDER BY date DESC
        `, userId, days);
    } catch (error) {
        console.error('Error getting credit usage:', error);
        return [];
    }
}

/**
 * Get monthly usage summary
 */
export async function getMonthlyUsage(userId) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    try {
        const usage = await db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::integer as credits_used,
                COALESCE(COUNT(CASE WHEN action = 'ai_message' THEN 1 END), 0)::integer as ai_messages,
                COALESCE(COUNT(CASE WHEN action = 'whatsapp_message_sent' THEN 1 END), 0)::integer as whatsapp_messages
            FROM credit_usage
            WHERE user_id = ? AND created_at >= ?
        `, userId, thisMonth.toISOString());
        
        return usage || { credits_used: 0, ai_messages: 0, whatsapp_messages: 0 };
    } catch (error) {
        return { credits_used: 0, ai_messages: 0, whatsapp_messages: 0 };
    }
}

/**
 * Reset monthly credits based on plan
 * This should be called by a cron job at the start of each month
 */
export async function resetMonthlyCredits() {
    const users = await db.all('SELECT id, plan FROM users WHERE is_active = 1');
    
    let resetCount = 0;
    for (const user of users) {
        const plan = await getPlan(user.plan);
        if (plan.limits.credits_per_month !== -1) {
            await db.run('UPDATE users SET credits = ? WHERE id = ?', plan.limits.credits_per_month, user.id);
            resetCount++;
        }
    }
    
    console.log(`[Credits] Reset monthly credits for ${resetCount} users`);
    return resetCount;
}

/**
 * Check if user is approaching credit limit
 */
export async function checkCreditWarnings(userId) {
    const user = await getUserCredits(userId);
    if (!user) return null;
    
    const plan = await getPlan(user.plan);
    
    if (plan.limits.credits_per_month === -1) {
        return { warning: null, level: 'ok' };
    }
    
    const percentUsed = ((plan.limits.credits_per_month - user.credits) / plan.limits.credits_per_month) * 100;
    
    if (user.credits <= 0) {
        return { 
            warning: 'Vos crédits sont épuisés. Passez à un plan supérieur pour continuer.',
            level: 'critical'
        };
    }
    
    if (percentUsed >= 90) {
        return { 
            warning: `Il vous reste ${user.credits} crédits (${Math.round(100 - percentUsed)}% restant)`,
            level: 'warning'
        };
    }
    
    if (percentUsed >= 75) {
        return { 
            warning: `Vous avez utilisé ${Math.round(percentUsed)}% de vos crédits`,
            level: 'info'
        };
    }
    
    return { warning: null, level: 'ok' };
}

export default {
    CREDIT_COSTS,
    getCreditCost,
    getUserCredits,
    hasEnoughCredits,
    deductCredits,
    addCredits,
    getCreditUsageHistory,
    getMonthlyUsage,
    resetMonthlyCredits,
    checkCreditWarnings,
};
