import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiService } from '../services/ai.js';
import { whatsappManager } from '../services/whatsapp.js';
import { getPlan, isLimitReached, getRemainingQuota, hasFeature, getAvailableModels } from '../config/plans.js';
import { checkCreditWarnings, getMonthlyUsage, CREDIT_COSTS } from '../services/credits.js';
import { validate, createAgentSchema, updateAgentSchema } from '../middleware/security.js';
import { getTemplates, getTemplate } from '../config/agentTemplates.js';

const router = Router();

// ==================== SYSTEM PROMPT TEMPLATES ====================

/**
 * Get available system prompt templates for agent creation
 */
router.get('/system-templates', authenticateToken, (req, res) => {
    try {
        const templates = getTemplates();
        res.json({ 
            templates: templates.map(t => ({
                id: t.id,
                name: t.name,
                icon: t.icon,
                description: t.description,
                system_prompt: t.system_prompt,
                response_delay: t.response_delay,
                auto_reply: t.auto_reply
            }))
        });
    } catch (error) {
        console.error('Get system templates error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * Get a specific system prompt template
 */
router.get('/system-templates/:id', authenticateToken, (req, res) => {
    try {
        const template = getTemplate(req.params.id);
        res.json({ template });
    } catch (error) {
        console.error('Get system template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== AI MODELS ====================

/**
 * Get available AI models from the database
 * This reflects the models configured in the admin panel
 */
router.get('/available-models', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT plan, is_admin FROM users WHERE id = ?', req.user.id);
        const models = await db.all('SELECT * FROM ai_models WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
        
        if (user.is_admin) {
            return res.json({ models });
        }

        const allowedModels = await getAvailableModels(user.plan);
        const filtered = models.filter(m => allowedModels.includes(m.id));
        
        res.json({ models: filtered });
    } catch (error) {
        console.error('Get available models error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== QUOTAS & PLAN INFO ====================

// Get user quotas and plan info
router.get('/quotas', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT plan, credits FROM users WHERE id = ?', req.user.id);
        const plan = await getPlan(user.plan);

        // Get current usage
        const agentsCountRow = await db.get('SELECT COUNT(*) as count FROM agents WHERE user_id = ?', req.user.id);
        const agentsCount = agentsCountRow?.count ?? 0;
        
        // Connected tools by type
        const whatsappRow = await db.get('SELECT COUNT(*) as count FROM tools WHERE user_id = ? AND type = ?', req.user.id, 'whatsapp');
        const whatsappConnected = whatsappRow?.count ?? 0;
        const outlookRow = await db.get('SELECT COUNT(*) as count FROM tools WHERE user_id = ? AND type = ?', req.user.id, 'outlook');
        const outlookConnected = outlookRow?.count ?? 0;
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const monthStart = thisMonth.toISOString();

        const convRow = await db.get(`
            SELECT COUNT(*) as count FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id, monthStart);
        const conversationsThisMonth = convRow?.count ?? 0;

        const msgRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id, monthStart);
        const messagesThisMonth = msgRow?.count ?? 0;

        const kbRow = await db.get(`
            SELECT COUNT(*) as count FROM knowledge_base kb
            JOIN agents a ON kb.agent_id = a.id
            WHERE a.user_id = ?
        `, req.user.id);
        const knowledgeItems = kbRow?.count ?? 0;

        const tplRow = await db.get(`
            SELECT COUNT(*) as count FROM templates t
            JOIN agents a ON t.agent_id = a.id
            WHERE a.user_id = ?
        `, req.user.id);
        const templates = tplRow?.count ?? 0;

        // Get credit warnings and monthly usage
        const creditWarning = await checkCreditWarnings(req.user.id);
        const monthlyUsage = await getMonthlyUsage(req.user.id);

        res.json({
            plan: {
                name: plan.name,
                displayName: plan.displayName,
                price: plan.price
            },
            credits: Math.floor(user.credits || 0),
            credit_warning: creditWarning,
            credit_costs: CREDIT_COSTS,
            limits: plan.limits,
            features: plan.features,
            usage: {
                agents: agentsCount,
                whatsapp_accounts: whatsappConnected,
                outlook_accounts: outlookConnected,
                conversations_this_month: conversationsThisMonth,
                messages_this_month: messagesThisMonth,
                knowledge_items: knowledgeItems,
                templates: templates,
                credits_used_this_month: Math.round(monthlyUsage.credits_used || 0),
                ai_messages_this_month: monthlyUsage.ai_messages
            },
            remaining: {
                agents: await getRemainingQuota(user.plan, 'agents', agentsCount),
                whatsapp_accounts: await getRemainingQuota(user.plan, 'whatsapp_accounts', whatsappConnected),
                outlook_accounts: await getRemainingQuota(user.plan, 'outlook_accounts', outlookConnected),
                conversations: await getRemainingQuota(user.plan, 'conversations_per_month', conversationsThisMonth),
                messages: await getRemainingQuota(user.plan, 'messages_per_month', messagesThisMonth),
                knowledge_items: await getRemainingQuota(user.plan, 'knowledge_items', knowledgeItems),
                templates: await getRemainingQuota(user.plan, 'templates', templates)
            },
            availableModels: await getAvailableModels(user.plan)
        });
    } catch (error) {
        console.error('Get quotas error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all agents for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT a.*, 
                   (SELECT COUNT(*) FROM conversations 
                    WHERE agent_id = a.id 
                    AND contact_jid NOT LIKE '%@g.us' 
                    AND contact_jid NOT LIKE '%broadcast%'
                    AND (contact_jid LIKE '%@s.whatsapp.net' OR contact_jid LIKE '%@lid')
                   ) as total_conversations,
                   (SELECT COUNT(*) FROM messages m 
                    JOIN conversations c ON m.conversation_id = c.id 
                    WHERE c.agent_id = a.id
                    AND c.contact_jid NOT LIKE '%@g.us'
                    AND c.contact_jid NOT LIKE '%broadcast%'
                    AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
                   ) as total_messages,
                   (SELECT status FROM tools WHERE id = a.tool_id AND user_id = a.user_id LIMIT 1) as tool_status
            FROM agents a 
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
        `, req.user.id);

        // Afficher "Connecté" si l'agent a whatsapp_connected OU si son outil assigné est connecté
        const agents = rows.map((a) => {
            const toolConnected = a.tool_id && a.tool_status === 'connected';
            const displayConnected = a.whatsapp_connected === 1 || toolConnected;
            const { tool_status, ...agent } = a;
            return { ...agent, whatsapp_connected: displayConnected ? 1 : 0 };
        });

        res.json({ agents });
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single agent
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const row = await db.get(`
            SELECT a.*,
                (SELECT status FROM tools WHERE id = a.tool_id AND user_id = a.user_id LIMIT 1) as tool_status,
                (SELECT label FROM tools WHERE id = a.tool_id AND user_id = a.user_id LIMIT 1) as tool_label,
                (SELECT meta FROM tools WHERE id = a.tool_id AND user_id = a.user_id LIMIT 1) as tool_meta,
                (SELECT type FROM tools WHERE id = a.tool_id AND user_id = a.user_id LIMIT 1) as tool_type
            FROM agents a
            WHERE a.id = ? AND a.user_id = ?
        `, req.params.id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const toolConnected = row.tool_id && row.tool_status === 'connected';
        const displayConnected = row.whatsapp_connected === 1 || toolConnected;
        let tool_phone = null;
        if (row.tool_meta) {
            try {
                const meta = typeof row.tool_meta === 'string' ? JSON.parse(row.tool_meta) : row.tool_meta;
                tool_phone = meta?.phone || null;
            } catch (_) {}
        }
        const { tool_status, tool_meta, tool_type, ...agent } = row;
        const agentWithStatus = {
            ...agent,
            tool_label: row.tool_label || null,
            tool_phone: tool_phone,
            whatsapp_connected: displayConnected ? 1 : 0
        };

        res.json({ agent: agentWithStatus });
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create agent
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            system_prompt, 
            model, 
            temperature, 
            max_tokens,
            language,
            template // New: template type for quick setup
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Le nom est requis' });
        }

        // Check plan limits
        const user = await db.get('SELECT plan FROM users WHERE id = ?', req.user.id);
        const agentsCountRow = await db.get('SELECT COUNT(*) as count FROM agents WHERE user_id = ?', req.user.id);
        const agentsCount = agentsCountRow?.count ?? 0;
        const plan = await getPlan(user.plan);

        if (await isLimitReached(user.plan, 'agents', agentsCount)) {
            return res.status(403).json({ 
                error: `Limite d'agents atteinte (${plan.limits.agents} max pour le plan ${plan.displayName})`,
                upgrade_required: true,
                current_plan: user.plan,
                limit: plan.limits.agents,
                current: agentsCount
            });
        }

        // 1. Fetch ALL active models from DB to respect admin's sort_order
        const dbModels = await db.all('SELECT id FROM ai_models WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
        
        // 2. Filter allowed models for user's plan
        const planAllowedIds = await getAvailableModels(user.plan);
        const allowedModels = dbModels.filter(m => planAllowedIds.includes(m.id)).map(m => m.id);

        // 3. Resolve the final model: specified -> check allowed | unspecified -> take first in list
        let finalModel = (allowedModels.length > 0) ? allowedModels[0] : 'gemini-1.5-flash';
        
        if (model) {
            // Admin can use any model in the DB models list, SaaS user restricted to plan list
            const searchList = req.user.is_admin ? dbModels.map(m => m.id) : allowedModels;
            if (searchList.includes(model)) {
                finalModel = model;
            }
        }

        // Get template-based prompt if template is specified
        const promptConfig = getTemplatePrompt(template, name);

        const agentId = uuidv4();

        await db.run(`
            INSERT INTO agents (id, user_id, name, description, system_prompt, model, temperature, max_tokens, language, response_delay, template)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, agentId, req.user.id, name, description || promptConfig.description, system_prompt || promptConfig.prompt, finalModel, temperature || promptConfig.temperature, max_tokens || 500, language || 'fr', 10, template || null);

        const agent = await db.get('SELECT * FROM agents WHERE id = ?', agentId);

        res.status(201).json({ 
            message: 'Agent créé avec succès',
            agent,
            model_adjusted: (model && finalModel !== model) ? `Modèle ajusté pour votre plan (${finalModel})` : null
        });
    } catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// Duplicate an existing agent
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    try {
        const { new_name } = req.body;

        // Get original agent
        const original = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!original) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Check plan limits
        const user = await db.get('SELECT plan FROM users WHERE id = ?', req.user.id);
        const agentsCountRow = await db.get('SELECT COUNT(*) as count FROM agents WHERE user_id = ?', req.user.id);
        const agentsCount = agentsCountRow?.count ?? 0;
        const plan = await getPlan(user.plan);

        if (await isLimitReached(user.plan, 'agents', agentsCount)) {
            return res.status(403).json({ 
                error: `Limite d'agents atteinte (${plan.limits.agents} max)`,
                upgrade_required: true
            });
        }

        const agentId = uuidv4();
        const duplicateName = new_name || `${original.name} (copie)`;

        await db.run(`
            INSERT INTO agents (id, user_id, name, description, system_prompt, model, temperature, max_tokens, language, response_delay, auto_reply, availability_enabled, availability_start, availability_end, availability_days, availability_timezone, absence_message, human_transfer_enabled, human_transfer_keywords, human_transfer_message, max_messages_per_day, template)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, agentId, req.user.id, duplicateName, original.description, original.system_prompt, original.model, original.temperature, original.max_tokens, original.language, original.response_delay || 0, original.auto_reply ?? 1, original.availability_enabled || 0, original.availability_start || '09:00', original.availability_end || '18:00', original.availability_days || '1,2,3,4,5', original.availability_timezone || 'Europe/Paris', original.absence_message, original.human_transfer_enabled || 0, original.human_transfer_keywords, original.human_transfer_message, original.max_messages_per_day || 0, original.template ?? null);

        // Copy knowledge base items
        const knowledgeItems = await db.all('SELECT * FROM knowledge_base WHERE agent_id = ?', req.params.id);
        for (const item of knowledgeItems) {
            await db.run(`
                INSERT INTO knowledge_base (id, agent_id, title, content, type, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `, uuidv4(), agentId, item.title, item.content, item.type, item.metadata);
        }

        // Copy templates
        const templates = await db.all('SELECT * FROM templates WHERE agent_id = ?', req.params.id);
        for (const tmpl of templates) {
            await db.run(`
                INSERT INTO templates (id, agent_id, name, content, shortcut, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `, uuidv4(), agentId, tmpl.name, tmpl.content, tmpl.shortcut, tmpl.category);
        }

        const agent = await db.get('SELECT * FROM agents WHERE id = ?', agentId);

        res.status(201).json({ 
            message: 'Agent dupliqué avec succès',
            agent,
            copied: {
                knowledge_items: knowledgeItems.length,
                templates: templates.length
            }
        });
    } catch (error) {
        console.error('Duplicate agent error:', error);
        res.status(500).json({ error: 'Erreur lors de la duplication' });
    }
});

/**
 * Get pre-configured prompt based on template type
 */
function getTemplatePrompt(template, agentName) {
    const templates = {
        ecommerce: {
            description: 'Assistant e-commerce pour la vente de produits',
            prompt: `Tu es un assistant e-commerce efficace et direct. Tu aides les clients à commander. Réponds directement.

⚡ RÈGLES ESSENTIELLES:
- Réponds en 2-3 phrases MAXIMUM
- Ne pose qu'UNE question à la fois
- Dès qu'un client confirme = c'est une COMMANDE
- Prix toujours en FCFA

🛒 PRISE DE COMMANDE RAPIDE:
1. Client demande un produit → Donne prix + confirme dispo
2. Client confirme → Demande livraison: "Commune/ville, quartier et numéro de téléphone ?"
3. Client donne infos → "Commande confirmée ✅ Vous serez contacté pour le paiement."

📍 INFOS LIVRAISON (demande en UNE question):
"Pour la livraison, indiquez: votre commune/ville, quartier et numéro de téléphone"

📦 STOCK:
- En stock ✅: "[Produit] à [Prix] FCFA, disponible !"
- Rupture ❌: "Désolé, rupture de stock. Je transfère à un conseiller."
- Stock limité ⚠️: "Il reste X unités."

❌ INTERDIT:
- Ne répète PAS "Bonjour" si déjà salué
- Ne pose PAS plusieurs questions à la fois
- Ne fais PAS de longs discours
- Ne redemande PAS confirmation plusieurs fois

✅ EXEMPLE:
Client: "Je veux 2 montre K20"
Toi: "2 Montres K20 à 12 000 FCFA/unité = 24 000 FCFA ✅ Disponibles ! Confirmez-vous ?"
Client: "Oui, livrez-moi"
Toi: "Parfait ! Commune/ville, quartier et numéro de téléphone pour la livraison ?"
Client: "Bingerville, Cité, 0701020304"
Toi: "Commande confirmée ✅ 2 Montres K20 - 24 000 FCFA - Livraison Bingerville. On vous contacte bientôt !"`,
            temperature: 0.4
        },
        commercial: {
            description: 'Assistant commercial pour la vente et la prospection',
            prompt: `Tu es un assistant commercial professionnel et persuasif. Réponds directement.

🎯 TON OBJECTIF:
- Qualifier les prospects et comprendre leurs besoins
- Présenter les produits/services de manière attractive
- Répondre aux objections avec tact
- Guider vers la conversion (achat, rdv, devis)

💬 TON STYLE:
- Professionnel mais chaleureux
- Utilise des questions ouvertes pour qualifier
- Mets en avant les bénéfices, pas les caractéristiques
- Crée un sentiment d'urgence sans être agressif

📦 GESTION DU STOCK (si e-commerce):
- Consulte le catalogue avant de parler d'un produit
- Informe sur la disponibilité réelle
- Propose des alternatives en cas de rupture

📋 PROCESS:
1. Salue et qualifie le besoin
2. Présente la solution adaptée
3. Traite les objections
4. Propose une action concrète`,
            temperature: 0.7
        },
        support: {
            description: 'Assistant support client pour l\'aide et le dépannage',
            prompt: `Tu es un assistant support client patient et efficace. Réponds directement au message du client.

🎯 TON OBJECTIF:
- Résoudre les problèmes des clients rapidement
- Fournir des instructions claires étape par étape
- Escalader vers un humain si nécessaire
- Assurer la satisfaction client

💬 TON STYLE:
- Empathique et rassurant
- Instructions numérotées et claires
- Confirme la résolution avant de clôturer
- Utilise un langage simple, évite le jargon

🆘 TRANSFERT HUMAIN:
Dis "Je transfère votre demande à un conseiller" si:
- Réclamation sur une commande
- Demande de remboursement
- Problème technique complexe
- Client mécontent

📋 PROCESS:
1. Accueille et identifie le problème
2. Pose des questions de diagnostic
3. Propose une solution pas à pas
4. Vérifie que le problème est résolu`,
            temperature: 0.5
        },
        faq: {
            description: 'Assistant FAQ pour répondre aux questions fréquentes',
            prompt: `Tu es un assistant qui répond aux questions fréquentes. Réponds directement à la question.

🎯 TON OBJECTIF:
- Répondre rapidement et précisément aux questions courantes
- Rediriger vers les bonnes ressources
- Collecter les questions non couvertes pour amélioration

💬 TON STYLE:
- Concis et direct
- Utilise des listes et des points clés
- Propose des liens ou ressources complémentaires
- Reste factuel

📦 PRODUITS:
- Consulte le catalogue pour les questions sur les produits
- Donne les prix en FCFA
- Mentionne la disponibilité

📋 SI TU NE SAIS PAS:
Dis honnêtement que tu n'as pas cette information et propose de transférer vers un humain.`,
            temperature: 0.3
        },
        appointment: {
            description: 'Assistant pour la prise de rendez-vous',
            prompt: `Tu es un assistant spécialisé dans la prise de rendez-vous. Réponds directement.

🎯 TON OBJECTIF:
- Qualifier le besoin du client
- Proposer des créneaux disponibles
- Confirmer et rappeler les détails du rdv
- Gérer les reports et annulations

💬 TON STYLE:
- Efficace et organisé
- Propose toujours plusieurs options de créneaux
- Récapitule systématiquement les informations
- Envoie des rappels

📋 INFORMATIONS À COLLECTER:
1. Nom complet
2. Numéro de téléphone
3. Motif du rendez-vous
4. Créneau souhaité`,
            temperature: 0.4
        },
        default: {
            description: '',
            prompt: `Tu es un assistant virtuel professionnel et amical. Réponds directement au message.

Tu réponds aux questions de manière concise et utile.
Tu utilises des emojis avec modération pour rendre la conversation plus naturelle.
Tu es toujours poli et tu essaies d'aider au maximum.

📦 PRODUITS:
- Si on te demande des produits, consulte le catalogue dans ta base de connaissance
- Indique les prix en FCFA et la disponibilité

🆘 TRANSFERT:
Si tu ne peux pas aider, dis: "Je transfère votre demande à un conseiller."

Si tu ne connais pas la réponse, dis-le honnêtement plutôt que d'inventer.`,
            temperature: 0.7
        },
        info: {
            description: 'Agent pour répondre aux questions générales',
            prompt: `Tu es un assistant d'information précis et concis. Réponds directement à la question.

🎯 TES OBJECTIFS:
- Répondre aux questions rapidement
- Utiliser la base de connaissances
- Rediriger si hors périmètre

📋 RÈGLES:
- Réponds dans la langue du client
- Sois FACTUEL et PRÉCIS
- Maximum 2-3 phrases
- Dis "Je ne sais pas" si tu n'as pas l'info
- Ne JAMAIS inventer d'informations

🔄 REDIRECTION:
- Commande → "Pour les commandes, contactez notre service commercial"
- Problème technique → "Pour l'assistance technique, écrivez à [contact]"`,
            temperature: 0.3
        },
        custom: {
            description: 'Template vide pour une configuration personnalisée',
            prompt: `Tu es un assistant virtuel professionnel. Réponds directement au message.

RÈGLES GÉNÉRALES:
- Réponds dans la langue du client
- Sois concis (2-3 phrases max)
- Sois professionnel et courtois
- Utilise la base de connaissances fournie
- Va droit au but, une question à la fois

[Personnalisez ce template selon vos besoins]`,
            temperature: 0.7
        }
    };

    return templates[template] || templates.default;
}

// Update agent
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            system_prompt, 
            model, 
            media_model,
            temperature, 
            max_tokens,
            language,
            response_delay,
            auto_reply,
            is_active,
            // Availability settings
            availability_enabled,
            availability_start,
            availability_end,
            availability_days,
            availability_timezone,
            absence_message,
            // Human transfer settings
            human_transfer_enabled,
            human_transfer_keywords,
            human_transfer_message,
            // Rate limiting
            max_messages_per_day,
            template,
            tool_id
        } = req.body;

        // Check ownership and current model
        const existing = await db.get('SELECT id, template, model FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Enforce model availability for the user's plan if not an admin
        let finalModel = model;
        if (model) {
            const dbModels = await db.all('SELECT id FROM ai_models WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
            if (req.user.is_admin) {
                if (!dbModels.some(m => m.id === model)) {
                    finalModel = existing.model; // Rollback if model doesn't exist
                }
            } else {
                const userRow = await db.get('SELECT plan FROM users WHERE id = ?', req.user.id);
                const planAllowedIds = await getAvailableModels(userRow.plan);
                const allowedModels = dbModels.filter(m => planAllowedIds.includes(m.id)).map(m => m.id);
                if (!allowedModels.includes(model)) {
                    // If not allowed, try to keep existing if still allowed, otherwise take the first allowed
                    finalModel = allowedModels.includes(existing.model) ? existing.model : (allowedModels[0] || 'gemini-1.5-flash');
                }
            }
        }

        const templateValue = req.body.template !== undefined ? (req.body.template || null) : existing.template ?? null;
        const toolIdValue = req.body.tool_id !== undefined ? (req.body.tool_id || null) : undefined;

        const updates = [
            'name = COALESCE(?, name)',
            'description = COALESCE(?, description)',
            'system_prompt = COALESCE(?, system_prompt)',
            'model = COALESCE(?, model)',
            'media_model = COALESCE(?, media_model)',
            'temperature = COALESCE(?, temperature)',
            'max_tokens = COALESCE(?, max_tokens)',
            'language = COALESCE(?, language)',
            'response_delay = COALESCE(?, response_delay)',
            'auto_reply = COALESCE(?, auto_reply)',
            'is_active = COALESCE(?, is_active)',
            'availability_enabled = COALESCE(?, availability_enabled)',
            'availability_start = COALESCE(?, availability_start)',
            'availability_end = COALESCE(?, availability_end)',
            'availability_days = COALESCE(?, availability_days)',
            'availability_timezone = COALESCE(?, availability_timezone)',
            'absence_message = COALESCE(?, absence_message)',
            'human_transfer_enabled = COALESCE(?, human_transfer_enabled)',
            'human_transfer_keywords = COALESCE(?, human_transfer_keywords)',
            'human_transfer_message = COALESCE(?, human_transfer_message)',
            'max_messages_per_day = COALESCE(?, max_messages_per_day)',
            'template = ?',
            'updated_at = CURRENT_TIMESTAMP'
        ];
        const values = [
            name, description, system_prompt, finalModel || null, media_model, temperature, max_tokens, language,
            response_delay, auto_reply, is_active,
            availability_enabled, availability_start, availability_end, availability_days, availability_timezone, absence_message,
            human_transfer_enabled, human_transfer_keywords, human_transfer_message,
            max_messages_per_day,
            templateValue
        ];
        if (toolIdValue !== undefined) {
            updates.push('tool_id = ?');
            values.push(toolIdValue);
        }
        values.push(req.params.id);
        await db.run(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`, ...values);

        // Si on vient d'assigner un outil déjà connecté, synchroniser whatsapp_connected
        if (toolIdValue) {
            const tool = await db.get('SELECT status, meta FROM tools WHERE id = ? AND user_id = ?', toolIdValue, req.user.id);
            if (tool?.status === 'connected') {
                const meta = tool.meta ? JSON.parse(tool.meta) : {};
                await db.run('UPDATE agents SET whatsapp_connected = 1, whatsapp_number = ? WHERE id = ?', meta.phone || null, req.params.id);
            }
        }

        const agent = await db.get('SELECT * FROM agents WHERE id = ?', req.params.id);


        // If agent was reactivated and has WhatsApp credentials, try to reconnect
        if (is_active === 1 && agent.whatsapp_connected === 1) {
            
            // Reconnect in background (don't block the response)
            const toolId = agent.tool_id || req.params.id;
            whatsappManager.connect(toolId).catch(err => {
                console.error(`[Agents] Failed to reconnect WhatsApp for agent ${req.params.id}:`, err.message);
            });
        }

        res.json({ agent });
    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete agent
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        await db.run('DELETE FROM agents WHERE id = ?', req.params.id);

        res.json({ message: 'Agent supprimé avec succès' });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Test agent (Playground)
router.post('/:id/test', authenticateToken, async (req, res) => {
    try {
        const { message, conversation } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Historique de conversation (Playground): tableau de { role: 'user'|'assistant', content: string }
        const conversationHistory = Array.isArray(conversation)
            ? conversation.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            : [];

        // Get agent
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Get agent-specific knowledge base
        const agentKnowledge = await db.all('SELECT title, content FROM knowledge_base WHERE agent_id = ?', req.params.id);
        
        // Get global knowledge base (user-level, shared across all agents)
        const globalKnowledge = await db.all('SELECT title, content FROM global_knowledge WHERE user_id = ?', req.user.id);
        
        // E-commerce only: inject products catalog and order rules (same as WhatsApp: id, product_images)
        const isEcommerce = agent.template === 'ecommerce';
        const products = isEcommerce
            ? await db.all('SELECT id, name, sku, price, stock, category, description, image_url FROM products WHERE user_id = ? AND is_active = 1', req.user.id)
            : [];
        let imagesByProductId = {};
        if (isEcommerce && products.length > 0) {
            const productIds = products.map(p => p.id);
            const placeholders = productIds.map(() => '?').join(',');
            const extraImages = await db.all(`SELECT product_id, url FROM product_images WHERE product_id IN (${placeholders}) ORDER BY product_id, position ASC`, ...productIds);
            for (const row of extraImages) {
                if (!imagesByProductId[row.product_id]) imagesByProductId[row.product_id] = [];
                imagesByProductId[row.product_id].push(row.url);
            }
        }
        const productKnowledge = isEcommerce && products.length > 0
            ? [{
                title: '📦 CATALOGUE PRODUITS',
                content: products.map(p => {
                    const allUrls = [...(p.image_url ? [p.image_url] : []), ...(imagesByProductId[p.id] || [])];
                    const uniqueUrls = [...new Set(allUrls)];
                    const imageLine = uniqueUrls.length > 0
                        ? (uniqueUrls.length === 1 ? `\n  Image: ${uniqueUrls[0]}` : `\n  Images: ${uniqueUrls.join(', ')}`)
                        : '';
                    return `- ${p.name}${p.sku ? ` (${p.sku})` : ''}: ${p.price} FCFA${p.stock === 0 ? ' ⛔ RUPTURE DE STOCK' : p.stock <= 5 ? ` ⚠️ STOCK LIMITÉ (${p.stock} unités)` : ` ✅ En stock (${p.stock})`}${p.category ? ` | ${p.category}` : ''}${p.description ? `\n  ${p.description}` : ''}${imageLine}`;
                }).join('\n')
            }, {
                title: '⚠️ RÈGLES DE GESTION DES COMMANDES',
                content: `IMPORTANT - Règles à suivre STRICTEMENT:

1. RUPTURE DE STOCK (⛔):
   - Si un client demande un produit en RUPTURE, dis-lui poliment que le produit n'est pas disponible
   - Propose des alternatives si possible
   - Dis: "Je vais transmettre votre demande à notre équipe pour vous tenir informé dès le retour en stock"

2. STOCK LIMITÉ (⚠️):
   - Si le client demande PLUS que le stock disponible, informe-le de la quantité maximale
   - Dis: "Nous avons actuellement X unités disponibles. Souhaitez-vous commander cette quantité?"

3. COMMANDE VALIDÉE:
   - Quand le client confirme une commande, résume: produit(s), quantité(s), prix total
   - Demande confirmation avant de finaliser

4. BESOIN D'INTERVENTION HUMAINE:
   - Stock insuffisant pour la demande
   - Demande de prix spécial ou négociation
   - Réclamation ou problème
   - Question hors de ta connaissance
   - Dans ces cas, dis: "Je transfère votre demande à un conseiller qui vous répondra rapidement"

5. INFORMATIONS DE LIVRAISON (adresse, téléphone):
   - Quand tu as demandé au client sa commune/ville, quartier et numéro de téléphone pour finaliser une commande, accepte les réponses partielles ou sur plusieurs messages.
   - Un message contenant UNIQUEMENT un numéro de téléphone (ex: 0758519080, 07 58 51 90 80) est VALIDE si tu attends le téléphone: considère-le comme le numéro de livraison et confirme la commande ou demande l'adresse si elle manque encore.
   - Un message contenant UNIQUEMENT une adresse ou un lieu (ex: Bingerville, Santai) est VALIDE si tu attends l'adresse: enregistre-la et demande le numéro si tu ne l'as pas encore.
   - Ne dis jamais "Je ne peux pas traiter un numéro de téléphone seul" (ou équivalent) lorsque tu viens de demander ce numéro pour finaliser une commande.`
            }]
            : [];

        // Combine all knowledge bases
        const knowledge = [...globalKnowledge, ...agentKnowledge, ...productKnowledge];

        console.log(`[Playground] Knowledge: ${globalKnowledge.length} global + ${agentKnowledge.length} agent + ${isEcommerce ? products.length : 0} products = ${knowledge.length} items`);

        // Generate AI response
        console.log(`[Playground] Testing agent ${agent.name} with message: ${message.substring(0, 50)}...`);
        
        const response = await aiService.generateResponse(agent, conversationHistory, message, knowledge, req.user.id);

        console.log(`[Playground] Response: ${response.content.substring(0, 50)}...`);

        res.json({ 
            response: response.content,
            tokens: response.tokens,
            model: response.model || agent.model,
            provider: response.provider,
            credit_warning: response.credit_warning
        });

    } catch (error) {
        console.error('Test agent error:', error);
        res.status(500).json({ error: 'Erreur lors du test: ' + error.message });
    }
});

// ==================== BLACKLIST ROUTES ====================

// Get blacklist for agent
router.get('/:id/blacklist', authenticateToken, async (req, res) => {
    try {
        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const blacklist = await db.all(`
            SELECT * FROM blacklist 
            WHERE agent_id = ?
            ORDER BY created_at DESC
        `, req.params.id);

        res.json({ blacklist });
    } catch (error) {
        console.error('Get blacklist error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add contact to blacklist
router.post('/:id/blacklist', authenticateToken, async (req, res) => {
    try {
        const { contact_jid, contact_name, reason } = req.body;

        if (!contact_jid) {
            return res.status(400).json({ error: 'Le contact est requis' });
        }

        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const blacklistId = uuidv4();
        
        try {
            await db.run(`
                INSERT INTO blacklist (id, agent_id, contact_jid, contact_name, reason)
                VALUES (?, ?, ?, ?, ?)
            `, blacklistId, req.params.id, contact_jid, contact_name || '', reason || '');
        } catch (e) {
            if (e.message && (e.message.includes('UNIQUE') || e.message.includes('unique') || e.code === '23505')) {
                return res.status(400).json({ error: 'Ce contact est déjà dans la liste noire' });
            }
            throw e;
        }

        const entry = await db.get('SELECT * FROM blacklist WHERE id = ?', blacklistId);

        res.status(201).json({ 
            message: 'Contact ajouté à la liste noire',
            entry 
        });
    } catch (error) {
        console.error('Add to blacklist error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Remove contact from blacklist
router.delete('/:id/blacklist/:blacklistId', authenticateToken, async (req, res) => {
    try {
        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const result = await db.run('DELETE FROM blacklist WHERE id = ? AND agent_id = ?', req.params.blacklistId, req.params.id);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Entrée non trouvée' });
        }

        res.json({ message: 'Contact retiré de la liste noire' });
    } catch (error) {
        console.error('Remove from blacklist error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== TEMPLATES ROUTES ====================

// Get templates for agent
router.get('/:id/templates', authenticateToken, async (req, res) => {
    try {
        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const templates = await db.all(`
            SELECT * FROM templates 
            WHERE agent_id = ?
            ORDER BY usage_count DESC, created_at DESC
        `, req.params.id);

        res.json({ templates });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create template
router.post('/:id/templates', authenticateToken, async (req, res) => {
    try {
        const { name, content, shortcut, category } = req.body;

        if (!name || !content) {
            return res.status(400).json({ error: 'Nom et contenu requis' });
        }

        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const templateId = uuidv4();
        
        await db.run(`
            INSERT INTO templates (id, agent_id, name, content, shortcut, category)
            VALUES (?, ?, ?, ?, ?, ?)
        `, templateId, req.params.id, name, content, shortcut || '', category || 'general');

        const template = await db.get('SELECT * FROM templates WHERE id = ?', templateId);

        res.status(201).json({ 
            message: 'Template créé',
            template 
        });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update template
router.put('/:id/templates/:templateId', authenticateToken, async (req, res) => {
    try {
        const { name, content, shortcut, category } = req.body;

        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        await db.run(`
            UPDATE templates SET 
                name = COALESCE(?, name),
                content = COALESCE(?, content),
                shortcut = COALESCE(?, shortcut),
                category = COALESCE(?, category)
            WHERE id = ? AND agent_id = ?
        `, name, content, shortcut, category, req.params.templateId, req.params.id);

        const template = await db.get('SELECT * FROM templates WHERE id = ?', req.params.templateId);

        res.json({ template });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete template
router.delete('/:id/templates/:templateId', authenticateToken, async (req, res) => {
    try {
        // Check ownership
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const result = await db.run('DELETE FROM templates WHERE id = ? AND agent_id = ?', req.params.templateId, req.params.id);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }

        res.json({ message: 'Template supprimé' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Increment template usage
router.post('/:id/templates/:templateId/use', authenticateToken, async (req, res) => {
    try {
        await db.run(`
            UPDATE templates SET usage_count = usage_count + 1 
            WHERE id = ? AND agent_id = ?
        `, req.params.templateId, req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Use template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get global knowledge assigned to an agent
router.get('/:id/global-knowledge', authenticateToken, async (req, res) => {
    try {
        const agent = await db.get('SELECT id, user_id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Get assigned global knowledge IDs
        const assigned = await db.all(`
            SELECT global_knowledge_id 
            FROM agent_global_knowledge 
            WHERE agent_id = ?
        `, req.params.id);

        const assignedIds = assigned.map(a => a.global_knowledge_id);

        res.json({ assignedIds });
    } catch (error) {
        console.error('Get agent global knowledge error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update global knowledge assignments for an agent
router.post('/:id/global-knowledge', authenticateToken, async (req, res) => {
    try {
        const { knowledgeIds } = req.body; // Array of global_knowledge IDs

        const agent = await db.get('SELECT id, user_id FROM agents WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        if (!Array.isArray(knowledgeIds)) {
            return res.status(400).json({ error: 'knowledgeIds doit être un tableau' });
        }

        // Verify all knowledge items belong to the user
        if (knowledgeIds.length > 0) {
            const placeholders = knowledgeIds.map(() => '?').join(',');
            const validItems = await db.all(`
                SELECT id FROM global_knowledge 
                WHERE id IN (${placeholders}) AND user_id = ?
            `, ...knowledgeIds, req.user.id);

            if (validItems.length !== knowledgeIds.length) {
                return res.status(400).json({ error: 'Certaines connaissances n\'existent pas ou ne vous appartiennent pas' });
            }
        }

        // Transaction: delete old assignments and insert new ones
        await db.run('DELETE FROM agent_global_knowledge WHERE agent_id = ?', req.params.id);

        if (knowledgeIds.length > 0) {
            for (const knowledgeId of knowledgeIds) {
                await db.run(`
                    INSERT INTO agent_global_knowledge (agent_id, global_knowledge_id) 
                    VALUES (?, ?)
                `, req.params.id, knowledgeId);
            }
        }

        console.log(`[Agents] Updated global knowledge assignments for agent ${req.params.id}: ${knowledgeIds.length} items`);

        res.json({ 
            message: 'Attributions mises à jour',
            assignedCount: knowledgeIds.length 
        });
    } catch (error) {
        console.error('Update agent global knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

export default router;
