import db from '../database/init.js';
import { aiService } from './ai.js';
import { whatsappManager } from './whatsapp.js';
import { v4 as uuidv4 } from 'uuid';
import { hasModuleForUser } from '../config/plans.js';

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

            const ordersToRelanceRaw = await db.all(`
                SELECT o.*, c.agent_id, c.customer_context, 
                       u.proactive_requires_validation, u.plan, u.next_best_action_enabled
                FROM orders o
                JOIN conversations c ON o.conversation_id = c.id
                JOIN users u ON o.user_id = u.id
                WHERE o.status = 'postponed' 
                AND o.proactive_relance_count = 0
                AND o.updated_at < ?
                AND o.updated_at > ?
            `, cutoffStart, cutoffEnd);

            const ordersToRelance = [];
            for (const order of ordersToRelanceRaw) {
                const hasModule3 = await hasModuleForUser(order, 'next_best_action');
                if (hasModule3) {
                    ordersToRelance.push(order);
                }
            }

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
                      // Fetch history for AI analysis
            const history = await db.all(
                'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10',
                order.conversation_id
            );
            history.reverse();

            const aiRelance = await aiService.generateProactiveMessage(agent, history, order.user_id);
            
            if (aiRelance.should_skip) {
                console.log(`[ProactiveAdvisor] Skipping relance for order ${order.id} (AI decision)`);
                // Mark as relanced anyway to avoid infinite retries on this old order
                await db.run('UPDATE orders SET proactive_relance_count = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), order.id);
                return;
            }

            const responseContent = aiRelance.message;
            const reason = aiRelance.reason || `Commande reportée: ${order.notes || 'Articles divers'}`;

            if (responseContent) {
                const requiresValidation = order.proactive_requires_validation === 1;

                if (requiresValidation) {
                    console.log(`[ProactiveAdvisor] Relance générée pour ${order.customer_name} (En attente de validation)`);
                    
                    // Insérer en attente
                    await db.run(`
                        INSERT INTO proactive_message_log (id, conversation_id, user_id, agent_id, type, status, message_content, reason)
                        VALUES (?, ?, ?, ?, 'postponed_order', 'pending', ?, ?)
                    `, uuidv4(), order.conversation_id, order.user_id, order.agent_id, responseContent, reason);
                    
                    // Marquer comme relancé pour ne pas régénérer
                    await db.run('UPDATE orders SET proactive_relance_count = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), order.id);

                } else {
                    console.log(`[ProactiveAdvisor] Envoi relance à ${order.customer_name} (${order.customer_phone})`);
                    
                    // Envoyer via WhatsApp
                    await whatsappManager.sendExternalMessage(order.agent_id, order.customer_phone, responseContent);

                    // Insérer en envoyé
                    await db.run(`
                        INSERT INTO proactive_message_log (id, conversation_id, user_id, agent_id, type, status, message_content, reason, sent_at)
                        VALUES (?, ?, ?, ?, 'postponed_order', 'sent', ?, ?, ?)
                    `, uuidv4(), order.conversation_id, order.user_id, order.agent_id, responseContent, reason, new Date().toISOString());

                    // Marquer comme relancé
                    await db.run('UPDATE orders SET proactive_relance_count = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), order.id);
                    
                    // Logger le message dans la conversation
                    await db.run(`
                        INSERT INTO messages (id, conversation_id, role, content, sender_type, message_type, created_at)
                        VALUES (?, ?, 'assistant', ?, 'ai', 'relance', ?)
                    `, uuidv4(), order.conversation_id, responseContent, new Date().toISOString());
                }
            }
        } catch (error) {
            console.error(`[ProactiveAdvisor] Erreur relance commande ${order.id}:`, error.message);
        }
    }
}

export const proactiveAdvisorService = new ProactiveAdvisorService();
export default proactiveAdvisorService;
