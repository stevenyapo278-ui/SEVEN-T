import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import aiService from '../services/ai.js';
import db from '../database/init.js';

const router = Router();
router.use(authenticate);

/**
 * POST /api/chatbot/message
 * Processes a user message through the configured AI model
 * Returns a structured JSON response with optional actions to execute
 */
router.post('/message', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const userId = req.user.id;

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Build the action-aware agent config
        // We pick the first active model (sorted by sort_order) from the admin panel
        const bestModel = await db.get(
            'SELECT id, model_id FROM ai_models WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 1'
        );

        const agentConfig = {
            id: 'internal-chatbot',
            name: 'Assistant SEVEN-T',
            model: bestModel?.id || 'gemini-2.0-flash',
            system_prompt: buildChatbotSystemPrompt(),
            template: 'assistant'
        };

        // Map frontend history to the format expected by aiService
        const conversationHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.role === 'user' ? msg.content : (msg.content?.rawText || msg.content?.body || JSON.stringify(msg.content))
        }));

        const aiResult = await aiService.generateResponse(
            agentConfig,
            conversationHistory,
            message,
            [],    // no knowledge base
            null,  // no message analysis
            userId
        );

        // Parse structured JSON from AI response
        let parsed = null;
        const rawContent = aiResult?.content || '';

        try {
            // Extract JSON from response (AI sometimes wraps in markdown code blocks)
            const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawContent.match(/(\{[\s\S]*\})/);
            const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
            parsed = JSON.parse(jsonStr);
        } catch {
            // Fallback: treat as plain text response
            parsed = {
                response: rawContent,
                action: null
            };
        }

        res.json({
            response: parsed.response || parsed.message || rawContent,
            action: parsed.action || null,
            rawText: rawContent,
            model: bestModel?.model_id || 'unknown'
        });

    } catch (error) {
        console.error('[Chatbot] Error:', error.message);
        res.status(500).json({
            error: 'Internal error',
            response: "Désolé, je rencontre une erreur. Réessayez dans quelques instants."
        });
    }
});

function buildChatbotSystemPrompt() {
    return `Tu es l'assistant IA interne de SEVEN-T, une plateforme SaaS d'automatisation WhatsApp.
Tu aides les opérateurs (utilisateurs connectés au dashboard) à gérer leur activité directement via le chat.

## TA MISSION
Répondre aux questions, effectuer des actions dans le système, et guider l'utilisateur.

## ACTIONS QUE TU PEUX DÉCLENCHER
Lorsque l'utilisateur demande une action, réponds avec un JSON structuré comme suit :

### Créer un produit
{ "response": "message pour l'utilisateur", "action": { "type": "CREATE_PRODUCT", "data": { "name": "...", "price": 1500, "description": "..." } } }

### Ajouter un contact/lead
{ "response": "message pour l'utilisateur", "action": { "type": "CREATE_LEAD", "data": { "name": "...", "phone": "...", "status": "new" } } }

### Naviguer vers une page
{ "response": "message pour l'utilisateur", "action": { "type": "NAVIGATE", "data": { "to": "/dashboard/products" } } }

Pages disponibles : /dashboard, /dashboard/conversations, /dashboard/products, /dashboard/leads, /dashboard/campaigns, /dashboard/agents, /dashboard/settings, /dashboard/tools, /dashboard/analytics, /dashboard/orders, /dashboard/workflows

### Afficher les statistiques
{ "response": "message pour l'utilisateur", "action": { "type": "SHOW_STATS" } }

### Réponse simple (pas d'action)
{ "response": "message pour l'utilisateur", "action": null }

## RÈGLES IMPORTANTES
1. Réponds TOUJOURS en JSON valide (pas de code markdown, pas de texte hors JSON)
2. Sois concis dans le champ "response" — 1-2 phrases max
3. Si l'utilisateur parle en français, réponds en français
4. N'invente pas de données — si tu ne sais pas, dis-le honnêtement
5. Pour les prix, accepte les variantes: "1500 FCFA", "1500 F", "1.5k"

## EXEMPLES DE COMPRÉHENSION
- "Crée le produit Café Touba à 1500 FCFA" → CREATE_PRODUCT avec name="Café Touba", price=1500
- "Ajoute Moussa au 0708091011" → CREATE_LEAD avec name="Moussa", phone="0708091011"
- "Montre mes contacts" / "Voir les leads" → NAVIGATE vers /dashboard/leads
- "Quelles sont mes stats ?" → SHOW_STATS
- "Comment connecter WhatsApp ?" → NAVIGATE vers /dashboard/tools + explication dans response`;
}

export default router;
