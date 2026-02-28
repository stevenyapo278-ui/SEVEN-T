import { Router } from 'express';
import db from '../database/init.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ==================== AI MODELS MANAGEMENT ====================

// Get all AI models
router.get('/models', authenticateAdmin, async (req, res) => {
    try {
        const { provider, category, active } = req.query;

        let query = 'SELECT * FROM ai_models WHERE 1=1';
        const params = [];

        if (provider) {
            query += ' AND provider = ?';
            params.push(provider);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (active !== undefined) {
            query += ' AND is_active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        query += ' ORDER BY sort_order ASC, name ASC';

        const models = await db.all(query, ...params);
        const list = Array.isArray(models) ? models : [];

        const modelsWithStats = await Promise.all(list.map(async (model) => {
            const usage = await db.get(`
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(tokens_used) as total_tokens,
                    SUM(credits_used) as total_credits,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
                FROM ai_model_usage
                WHERE model_id = ?
            `, model.id);

            const uniqueUsers = await db.get(`
                SELECT COUNT(DISTINCT user_id) as count
                FROM ai_model_usage
                WHERE model_id = ? AND user_id IS NOT NULL
            `, model.id);

            return {
                ...model,
                stats: {
                    total_requests: Number(usage?.total_requests ?? 0),
                    total_tokens: Number(usage?.total_tokens ?? 0),
                    total_credits: Number(usage?.total_credits ?? 0),
                    avg_response_time: Math.round(Number(usage?.avg_response_time ?? 0)),
                    error_count: Number(usage?.error_count ?? 0),
                    unique_users: Number(uniqueUsers?.count ?? 0)
                }
            };
        }));

        res.json({ models: modelsWithStats });
    } catch (error) {
        console.error('Get AI models error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single AI model
router.get('/models/:id', authenticateAdmin, async (req, res) => {
    try {
        const model = await db.get('SELECT * FROM ai_models WHERE id = ?', req.params.id);

        if (!model) {
            return res.status(404).json({ error: 'Modèle non trouvé' });
        }

        const usageByUser = await db.all(`
            SELECT 
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                COUNT(*) as request_count,
                SUM(credits_used) as credits_used
            FROM ai_model_usage mu
            JOIN users u ON mu.user_id = u.id
            WHERE mu.model_id = ?
            GROUP BY u.id
            ORDER BY request_count DESC
            LIMIT 20
        `, req.params.id);

        // Get usage trend (last 30 days)
        const usageTrend = await db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as requests,
                SUM(credits_used) as credits
            FROM ai_model_usage
            WHERE model_id = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, req.params.id);

        res.json({ model, usageByUser, usageTrend });
    } catch (error) {
        console.error('Get AI model error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create new AI model
router.post('/models', authenticateAdmin, (req, res) => {
    try {
        const { 
            name, provider, model_id, description, 
            credits_per_use, is_free, is_active,
            max_tokens, supports_vision, supports_tools,
            category, sort_order
        } = req.body;

        if (!name || !provider || !model_id) {
            return res.status(400).json({ error: 'Nom, provider et model_id requis' });
        }

        // Check if model already exists
        const existing = db.prepare('SELECT id FROM ai_models WHERE provider = ? AND model_id = ?').get(provider, model_id);
        if (existing) {
            return res.status(400).json({ error: 'Ce modèle existe déjà' });
        }

        const id = uuidv4();
        db.prepare(`
            INSERT INTO ai_models (id, name, provider, model_id, description, credits_per_use, is_free, is_active, max_tokens, supports_vision, supports_tools, category, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, name, provider, model_id, description || '',
            credits_per_use || 1, is_free ? 1 : 0, is_active !== false ? 1 : 0,
            max_tokens || 4096, supports_vision ? 1 : 0, supports_tools ? 1 : 0,
            category || 'general', sort_order || 0
        );

        const model = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id);
        res.status(201).json({ model });
    } catch (error) {
        console.error('Create AI model error:', error);
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// Update AI model
router.put('/models/:id', authenticateAdmin, (req, res) => {
    try {
        const model = db.prepare('SELECT id FROM ai_models WHERE id = ?').get(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Modèle non trouvé' });
        }

        const { 
            name, description, credits_per_use, is_free, is_active,
            max_tokens, supports_vision, supports_tools, category, sort_order
        } = req.body;

        db.prepare(`
            UPDATE ai_models SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                credits_per_use = COALESCE(?, credits_per_use),
                is_free = COALESCE(?, is_free),
                is_active = COALESCE(?, is_active),
                max_tokens = COALESCE(?, max_tokens),
                supports_vision = COALESCE(?, supports_vision),
                supports_tools = COALESCE(?, supports_tools),
                category = COALESCE(?, category),
                sort_order = COALESCE(?, sort_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name, description, credits_per_use, 
            is_free !== undefined ? (is_free ? 1 : 0) : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            max_tokens, 
            supports_vision !== undefined ? (supports_vision ? 1 : 0) : null,
            supports_tools !== undefined ? (supports_tools ? 1 : 0) : null,
            category, sort_order,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(req.params.id);
        res.json({ model: updated });
    } catch (error) {
        console.error('Update AI model error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete AI model
router.delete('/models/:id', authenticateAdmin, (req, res) => {
    try {
        const model = db.prepare('SELECT id, name FROM ai_models WHERE id = ?').get(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Modèle non trouvé' });
        }

        // Check if model is used by any agents
        const usageCount = db.prepare(`
            SELECT COUNT(*) as count FROM agents WHERE model = ?
        `).get(model.id)?.count || 0;

        if (usageCount > 0) {
            return res.status(400).json({ 
                error: `Ce modèle est utilisé par ${usageCount} agent(s). Désactivez-le plutôt.`
            });
        }

        db.prepare('DELETE FROM ai_models WHERE id = ?').run(req.params.id);
        res.json({ message: 'Modèle supprimé' });
    } catch (error) {
        console.error('Delete AI model error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ==================== PLATFORM SETTINGS ====================

// Get platform settings (e.g. default_media_model for images/voice)
router.get('/settings', authenticateAdmin, async (req, res) => {
    try {
        const rows = await db.all('SELECT key, value FROM platform_settings');
        const arr = Array.isArray(rows) ? rows : [];
        const settings = {};
        for (const { key, value } of arr) {
            settings[key] = value;
        }
        if (settings.default_media_model == null) {
            settings.default_media_model = 'gemini-1.5-flash';
        }
        if (settings.voice_responses_enabled == null) {
            settings.voice_responses_enabled = '0';
        }
        res.json({ settings });
    } catch (error) {
        console.error('Get platform settings error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update platform settings
router.put('/settings', authenticateAdmin, async (req, res) => {
    try {
        const { default_media_model, voice_responses_enabled } = req.body;
        if (default_media_model !== undefined) {
            await db.run(`
                INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            `, 'default_media_model', default_media_model === '' ? null : default_media_model);
        }
        if (voice_responses_enabled !== undefined) {
            const val = voice_responses_enabled ? '1' : '0';
            await db.run(`
                INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            `, 'voice_responses_enabled', val);
        }
        const rows = await db.all('SELECT key, value FROM platform_settings');
        const arr = Array.isArray(rows) ? rows : [];
        const settings = {};
        for (const { key, value } of arr) settings[key] = value;
        res.json({ settings });
    } catch (error) {
        console.error('Update platform settings error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// ==================== API KEYS MANAGEMENT ====================

// Get all API keys (masked)
router.get('/api-keys', authenticateAdmin, async (req, res) => {
    try {
        const keys = await db.all('SELECT * FROM ai_api_keys ORDER BY provider ASC');
        const list = Array.isArray(keys) ? keys : [];

        const maskedKeys = list.map(key => ({
            ...key,
            api_key: key.api_key ? `${key.api_key.substring(0, 8)}...${key.api_key.slice(-4)}` : null,
            has_key: !!key.api_key
        }));

        res.json({ keys: maskedKeys });
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Set/Update API key for provider
router.put('/api-keys/:provider', authenticateAdmin, (req, res) => {
    try {
        const { api_key, is_active } = req.body;
        const { provider } = req.params;

        if (!['gemini', 'openai', 'openrouter'].includes(provider)) {
            return res.status(400).json({ error: 'Provider invalide' });
        }

        const existing = db.prepare('SELECT id FROM ai_api_keys WHERE provider = ?').get(provider);

        if (existing) {
            // Update existing key
            if (api_key !== undefined && api_key !== '') {
                db.prepare(`
                    UPDATE ai_api_keys SET 
                        api_key = ?,
                        is_active = COALESCE(?, is_active),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE provider = ?
                `).run(api_key, is_active !== undefined ? (is_active ? 1 : 0) : null, provider);
            } else if (is_active !== undefined) {
                db.prepare(`
                    UPDATE ai_api_keys SET 
                        is_active = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE provider = ?
                `).run(is_active ? 1 : 0, provider);
            }
        } else {
            // Create new key
            if (!api_key) {
                return res.status(400).json({ error: 'Clé API requise' });
            }
            const id = uuidv4();
            db.prepare(`
                INSERT INTO ai_api_keys (id, provider, api_key, is_active)
                VALUES (?, ?, ?, ?)
            `).run(id, provider, api_key, is_active !== false ? 1 : 0);
        }

        // Update environment variable in memory (for immediate effect)
        const envVarName = {
            gemini: 'GEMINI_API_KEY',
            openai: 'OPENAI_API_KEY',
            openrouter: 'OPENROUTER_API_KEY'
        }[provider];

        if (envVarName && api_key) {
            process.env[envVarName] = api_key;
        }

        res.json({ message: 'Clé API mise à jour', provider });
    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Test API key
router.post('/api-keys/:provider/test', authenticateAdmin, async (req, res) => {
    try {
        const { provider } = req.params;
        
        const keyRecord = await db.get('SELECT api_key FROM ai_api_keys WHERE provider = ? AND is_active = 1', provider);
        const apiKey = keyRecord?.api_key || process.env[{
            gemini: 'GEMINI_API_KEY',
            openai: 'OPENAI_API_KEY',
            openrouter: 'OPENROUTER_API_KEY'
        }[provider]];

        if (!apiKey) {
            return res.status(400).json({ success: false, error: 'Aucune clé API configurée' });
        }

        let testResult = { success: false, message: '' };

        if (provider === 'gemini') {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
                    }
                );
                testResult = { success: response.ok, message: response.ok ? 'Connexion réussie' : `Erreur: ${response.status}` };
            } catch (e) {
                testResult = { success: false, message: e.message };
            }
        } else if (provider === 'openai') {
            try {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                testResult = { success: response.ok, message: response.ok ? 'Connexion réussie' : `Erreur: ${response.status}` };
            } catch (e) {
                testResult = { success: false, message: e.message };
            }
        } else if (provider === 'openrouter') {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                testResult = { success: response.ok, message: response.ok ? 'Connexion réussie' : `Erreur: ${response.status}` };
            } catch (e) {
                testResult = { success: false, message: e.message };
            }
        }

        if (keyRecord) {
            await db.run(`
                UPDATE ai_api_keys SET 
                    last_used_at = CURRENT_TIMESTAMP,
                    request_count = request_count + 1,
                    error_count = error_count + ?,
                    last_error = ?
                WHERE provider = ?
            `, testResult.success ? 0 : 1, testResult.success ? null : testResult.message, provider);
        }

        res.json(testResult);
    } catch (error) {
        console.error('Test API key error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== USAGE STATISTICS ====================

// Get overall AI usage stats
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const overall = await db.get(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(tokens_used) as total_tokens,
                SUM(credits_used) as total_credits,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
            FROM ai_model_usage
        `);

        const byProvider = await db.all(`
            SELECT 
                m.provider,
                COUNT(*) as requests,
                SUM(mu.credits_used) as credits_used,
                AVG(mu.response_time_ms) as avg_response_time
            FROM ai_model_usage mu
            JOIN ai_models m ON mu.model_id = m.id
            GROUP BY m.provider
            ORDER BY requests DESC
        `);

        const topModels = await db.all(`
            SELECT 
                m.id,
                m.name,
                m.provider,
                COUNT(*) as requests,
                SUM(mu.credits_used) as credits_used
            FROM ai_model_usage mu
            JOIN ai_models m ON mu.model_id = m.id
            GROUP BY m.id
            ORDER BY requests DESC
            LIMIT 10
        `);

        const topUsers = await db.all(`
            SELECT * FROM (
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    COALESCE(SUM(mu.tokens_used), 0) + (
                        SELECT COALESCE(SUM(m.tokens_used), 0)
                        FROM messages m
                        JOIN conversations c ON m.conversation_id = c.id
                        JOIN agents a ON c.agent_id = a.id
                        WHERE a.user_id = u.id AND m.role = 'assistant'
                    ) as total_tokens,
                    COUNT(mu.id) as requests,
                    COALESCE(SUM(mu.credits_used), 0) as credits_used,
                    ROUND(AVG(NULLIF(mu.response_time_ms, 0)), 0) as avg_response_time,
                    ROUND(SUM(CASE WHEN mu.success = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(mu.id), 0), 1) as success_rate
                FROM users u
                LEFT JOIN ai_model_usage mu ON u.id = mu.user_id
                GROUP BY u.id, u.name, u.email
            ) as user_stats
            WHERE total_tokens > 0
            ORDER BY total_tokens DESC
            LIMIT 10
        `);

        const dailyTrend = await db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as requests,
                SUM(credits_used) as credits,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
            FROM ai_model_usage
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        const activeModels = await db.get('SELECT COUNT(*) as count FROM ai_models WHERE is_active = 1');
        const configuredKeys = await db.all('SELECT provider, is_active FROM ai_api_keys');

        res.json({
            overall: {
                total_requests: overall?.total_requests || 0,
                total_tokens: overall?.total_tokens || 0,
                total_credits: overall?.total_credits || 0,
                avg_response_time: Math.round(overall?.avg_response_time || 0),
                error_count: overall?.error_count || 0,
                error_rate: overall?.total_requests > 0 
                    ? ((overall.error_count / overall.total_requests) * 100).toFixed(2) 
                    : 0
            },
            byProvider,
            topModels,
            topUsers,
            dailyTrend,
            activeModels: activeModels?.count || 0,
            configuredKeys: configuredKeys.map(k => ({ provider: k.provider, active: k.is_active === 1 }))
        });
    } catch (error) {
        console.error('Get AI stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get users using a specific model
router.get('/models/:id/users', authenticateAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT DISTINCT
                u.id,
                u.name,
                u.email,
                u.plan,
                COUNT(*) as usage_count,
                SUM(mu.credits_used) as total_credits,
                MAX(mu.created_at) as last_used
            FROM ai_model_usage mu
            JOIN users u ON mu.user_id = u.id
            WHERE mu.model_id = ?
            GROUP BY u.id
            ORDER BY usage_count DESC
        `).all(req.params.id);

        res.json({ users });
    } catch (error) {
        console.error('Get model users error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
