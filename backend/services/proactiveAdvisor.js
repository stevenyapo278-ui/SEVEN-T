import db from '../database/init.js';
import { aiService } from './ai.js';
import { whatsappManager } from './whatsapp.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service pour la relance proactive des commandes reportées (postponed)
 */
class ProactiveAdvisorService {
    constructor() {
        this.interval = null;
    }

    /**
     * Démarre la boucle de surveillance (ex: toutes les 30 minutes)
     */
    start() {
        if (this.interval) return;
        console.log('🚀 [ProactiveAdvisor] Service démarré');
        // Vérification toutes les 30 minutes
        this.interval = setInterval(() => this.checkPostponedOrders(), 30 * 60 * 1000);
        // Première vérification après 1 minute
        setTimeout(() => this.checkPostponedOrders(), 60 * 1000);
    }

    /**
     * Scanne les commandes reportées et envoie une relance si nécessaire
     */
    async checkPostponedOrders() {
        try {
            console.log('[ProactiveAdvisor] Recherche de commandes à relancer...');
            
            // On cherche les commandes 'postponed' non relancées, créées il y a plus de 15h mais moins de 48h
            // (Pour éviter de relancer des trucs trop vieux)
            const cutoffStart = new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString();
            const cutoffEnd = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

            const ordersToRelance = await db.all(`
                SELECT o.*, c.agent_id, c.customer_context
                FROM orders o
                JOIN conversations c ON o.conversation_id = c.id
                JOIN users u ON o.user_id = u.id
                WHERE o.status = 'postponed' 
                AND o.proactive_relance_count = 0
                AND u.proactive_advisor_enabled = 1
                AND o.updated_at < ?
                AND o.updated_at > ?
            `, cutoffStart, cutoffEnd);

            if (ordersToRelance.length === 0) {
                console.log('[ProactiveAdvisor] Aucune commande à relancer actuellement.');
                return;
            }

            console.log(`[ProactiveAdvisor] ${ordersToRelance.length} commandes trouvées pour relance.`);

            for (const order of ordersToRelance) {
                await this.processRelance(order);
            }
        } catch (error) {
            console.error('[ProactiveAdvisor] Erreur scan:', error.message);
        }
    }

    /**
     * Génère et envoie la relance pour une commande précise
     */
    async processRelance(order) {
        try {
            const agent = await db.get('SELECT * FROM agents WHERE id = ?', order.agent_id);
            if (!agent) return;

            // Préparer le contexte pour l'IA
            const context = `RELANCE PROACTIVE : Le client avait reporté sa commande hier (Statut: postponed). 
            Détails de la commande: ${order.notes || 'Non spécifié'}. 
            Total: ${order.total_amount} ${order.currency}.
            ID Conversation: ${order.conversation_id}`;

            const relancePrompt = `Tu es une IA qui effectue une relance proactive. 
            Le client a dit hier qu'il préférait attendre. 
            Ta mission : Prends de ses nouvelles de manière très courte, naturelle et amicale. 
            Vérifie s'il est prêt à finaliser sa commande aujourd'hui.
            COMMANDE EN ATTENTE : ${order.notes || 'Articles divers'}.
            
            RÈGLE : Ne sois pas insistant. Max 2 phrases. 
            FORMAT : {"response": "ton message ici", "need_human": false}`;

            // Simuler l'analyse de message pour injecter le contexte
            const messageAnalysis = {
                intent: { primary: 'relance' },
                customerContext: order.customer_context
            };

            const response = await aiService.generateResponse(
                agent, 
                [], // Pas besoin d'historique complet pour un nouveau "hook"
                relancePrompt, 
                [], 
                messageAnalysis, 
                order.user_id
            );

            if (response?.content) {
                console.log(`[ProactiveAdvisor] Envoi relance à ${order.customer_name} (${order.customer_phone})`);
                
                // Envoyer via WhatsApp
                await whatsappManager.sendExternalMessage(order.agent_id, order.customer_phone, response.content);

                // Marquer comme relancé
                await db.run('UPDATE orders SET proactive_relance_count = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), order.id);
                
                // Logger le message dans la conversation
                await db.run(`
                    INSERT INTO messages (id, conversation_id, role, content, sender_type, message_type, created_at)
                    VALUES (?, ?, 'assistant', ?, 'ai', 'relance', ?)
                `, uuidv4(), order.conversation_id, response.content, new Date().toISOString());
            }

        } catch (error) {
            console.error(`[ProactiveAdvisor] Erreur relance commande ${order.id}:`, error.message);
        }
    }
}

export const proactiveAdvisorService = new ProactiveAdvisorService();
export default proactiveAdvisorService;
