/**
 * Human Intervention Service
 * Detects when conversations need human attention
 */

import db from '../database/init.js';
import { notificationService } from './notifications.js';

// Keywords/phrases that trigger human intervention
const INTERVENTION_TRIGGERS = {
    // Stock issues
    stock: [
        'rupture', 'pas de stock', 'plus en stock', 'pas disponible',
        'stock insuffisant', 'quantité insuffisante'
    ],
    // Complaints
    complaint: [
        'réclamation', 'problème', 'plainte', 'pas content', 'mécontent',
        'remboursement', 'arnaque', 'voleur', 'scandale', 'honteux'
    ],
    // Price negotiation
    negotiation: [
        'réduction', 'remise', 'promotion', 'moins cher', 'négocier',
        'prix spécial', 'ristourne', 'rabais'
    ],
    // Explicit human request
    human: [
        'parler à un humain', 'un conseiller', 'quelqu\'un', 'responsable',
        'manager', 'chef', 'personne réelle', 'pas un robot', 'pas une ia',
        'human', 'agent', 'assistance humaine'
    ],
    // Complex questions
    complex: [
        'je ne comprends pas', 'tu ne m\'aides pas', 'réponds pas à ma question',
        'c\'est pas ce que je demande', 'tu me comprends pas'
    ]
};

class HumanInterventionService {
    /**
     * Analyze a message and AI response for intervention triggers
     * @param {string} userMessage - User's message
     * @param {string} aiResponse - AI's response  
     * @param {Object} conversation - Conversation object
     * @param {string} userId - User ID (owner)
     * @returns {boolean} - True if intervention is needed
     */
    checkForIntervention(userMessage, aiResponse, conversation, userId) {
        const lowerMessage = userMessage.toLowerCase();
        const lowerResponse = aiResponse.toLowerCase();
        
        let needsIntervention = false;
        let reasons = [];

        // Check user message for triggers
        for (const [category, keywords] of Object.entries(INTERVENTION_TRIGGERS)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    needsIntervention = true;
                    reasons.push(`${category}: "${keyword}"`);
                    break;
                }
            }
        }

        // Check AI response for signs it's flagging for human help
        const aiInterventionPhrases = [
            'transmettre votre demande',
            'transférer votre demande',
            'un conseiller',
            'notre équipe',
            'vous recontacter',
            'intervention humaine',
            'je ne peux pas',
            'je ne suis pas en mesure',
            'dépasse mes compétences'
        ];

        for (const phrase of aiInterventionPhrases) {
            if (lowerResponse.includes(phrase)) {
                needsIntervention = true;
                reasons.push(`AI flagged: "${phrase}"`);
                break;
            }
        }

        // If intervention is needed, update the conversation
        if (needsIntervention) {
            this.flagConversation(conversation.id, userId, reasons.join(', '));
        }

        return needsIntervention;
    }

    /**
     * Flag a conversation as needing human intervention
     */
    flagConversation(conversationId, userId, reason) {
        try {
            // Check if already flagged
            const conv = db.prepare('SELECT needs_human FROM conversations WHERE id = ?').get(conversationId);
            if (conv?.needs_human === 1) {
                return; // Already flagged
            }

            // Update conversation
            db.prepare(`
                UPDATE conversations SET 
                    needs_human = 1,
                    needs_human_reason = ?,
                    priority = 'high'
                WHERE id = ?
            `).run(reason, conversationId);

            // Get conversation details for notification
            const conversation = db.prepare(`
                SELECT c.*, a.name as agent_name 
                FROM conversations c
                LEFT JOIN agents a ON c.agent_id = a.id
                WHERE c.id = ?
            `).get(conversationId);

            // Create notification
            const contactName = conversation?.saved_contact_name || 
                              conversation?.contact_name || 
                              conversation?.push_name ||
                              'Client';

            notificationService.create(userId, {
                type: 'warning',
                title: '🆘 Intervention requise',
                message: `${contactName} a besoin d'aide (${reason.substring(0, 50)}...)`,
                link: `/dashboard/conversations/${conversationId}`
            });

            console.log(`[HumanIntervention] Flagged conversation ${conversationId}: ${reason}`);

            return true;
        } catch (error) {
            console.error('[HumanIntervention] Error flagging conversation:', error);
            return false;
        }
    }

    /**
     * Mark conversation as handled (human has responded)
     */
    markAsHandled(conversationId) {
        try {
            db.prepare(`
                UPDATE conversations SET 
                    needs_human = 0,
                    needs_human_reason = NULL
                WHERE id = ?
            `).run(conversationId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all conversations needing human intervention
     */
    getConversationsNeedingHelp(userId) {
        return db.prepare(`
            SELECT c.*, a.name as agent_name
            FROM conversations c
            LEFT JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.needs_human = 1
            ORDER BY c.last_message_at DESC
        `).all(userId);
    }

    /**
     * Get count of conversations needing help
     */
    getHelpNeededCount(userId) {
        const result = db.prepare(`
            SELECT COUNT(*) as count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.needs_human = 1
        `).get(userId);
        return result?.count || 0;
    }
}

export const humanInterventionService = new HumanInterventionService();
export default humanInterventionService;
