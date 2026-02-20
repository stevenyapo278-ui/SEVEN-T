/**
 * Lead Analyzer Service
 * Analyzes conversations to detect potential leads using AI or keyword analysis
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import aiService from './ai.js';
import { notificationService } from './notifications.js';
import { workflowExecutor } from './workflowExecutor.js';

// Keywords that indicate buying intent
const BUYING_INTENT_KEYWORDS = {
    high: [
        'acheter', 'commander', 'prix', 'tarif', 'coût', 'combien',
        'disponible', 'stock', 'livraison', 'payer', 'paiement',
        'carte bancaire', 'virement', 'facture', 'devis',
        'je veux', 'je voudrais', 'j\'aimerais', 'intéressé',
        'commander', 'réserver', 'achat', 'budget'
    ],
    medium: [
        'information', 'renseignement', 'détails', 'caractéristiques',
        'option', 'version', 'modèle', 'taille', 'couleur',
        'garantie', 'retour', 'échange', 'service',
        'quand', 'délai', 'temps', 'urgent'
    ],
    low: [
        'bonjour', 'salut', 'question', 'demande', 'aide',
        'merci', 'ok', 'oui', 'non'
    ]
};

// Keywords that indicate the person is NOT a lead
const NON_LEAD_KEYWORDS = [
    'spam', 'pub', 'publicité', 'newsletter', 'désabonner',
    'erreur', 'mauvais numéro', 'faux numéro', 'stop'
];

class LeadAnalyzer {
    /**
     * Analyze a conversation to determine if it's a potential lead
     * @param {Object} conversation - Conversation object
     * @param {Array} messages - Array of messages in the conversation
     * @param {Object} agent - Agent object (not used currently)
     * @param {string} userId - User ID to check for existing leads
     * @returns {Object|null} - Lead suggestion or null
     */
    async analyzeConversation(conversation, messages, agent, userId) {
        if (!messages || messages.length === 0) {
            return null;
        }

        // Get only user messages
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length === 0) {
            return null;
        }

        // Combine all user messages
        const allUserText = userMessages.map(m => m.content).join(' ').toLowerCase();

        // Check for non-lead keywords first
        for (const keyword of NON_LEAD_KEYWORDS) {
            if (allUserText.includes(keyword)) {
                console.log(`[LeadAnalyzer] Non-lead keyword detected: ${keyword}`);
                return null;
            }
        }

        const existingByConv = await db.get(`
            SELECT id FROM leads WHERE conversation_id = ?
        `, conversation.id);

        if (existingByConv) {
            console.log(`[LeadAnalyzer] Lead already exists for conversation ${conversation.id}`);
            return null;
        }

        if (conversation.contact_number && userId) {
            const existingByPhone = await db.get(`
                SELECT id, name FROM leads WHERE phone = ? AND user_id = ?
            `, conversation.contact_number, userId);
            
            if (existingByPhone) {
                console.log(`[LeadAnalyzer] Lead already exists for phone ${conversation.contact_number} (lead ${existingByPhone.id}: ${existingByPhone.name})`);
                return null;
            }
        }

        // Calculate intent score
        const analysis = this.calculateIntentScore(allUserText, userMessages.length);

        console.log(`[LeadAnalyzer] Conversation ${conversation.id}: Score ${analysis.score}, Confidence ${analysis.confidence}`);

        // If score is high enough, suggest as lead
        if (analysis.score >= 30 && analysis.confidence >= 0.4) {
            return {
                shouldSuggest: true,
                confidence: analysis.confidence,
                reason: analysis.reason,
                keywords: analysis.matchedKeywords
            };
        }

        return null;
    }

    /**
     * Calculate intent score based on keywords and message patterns
     */
    calculateIntentScore(text, messageCount) {
        let score = 0;
        let matchedKeywords = [];
        let reasons = [];

        // Check high intent keywords (10 points each)
        for (const keyword of BUYING_INTENT_KEYWORDS.high) {
            if (text.includes(keyword)) {
                score += 10;
                matchedKeywords.push(keyword);
                if (matchedKeywords.length <= 3) {
                    reasons.push(`Mention de "${keyword}"`);
                }
            }
        }

        // Check medium intent keywords (5 points each)
        for (const keyword of BUYING_INTENT_KEYWORDS.medium) {
            if (text.includes(keyword)) {
                score += 5;
                matchedKeywords.push(keyword);
            }
        }

        // Bonus for engagement (number of messages)
        if (messageCount >= 3) {
            score += 10;
            reasons.push('Conversation active (3+ messages)');
        }
        if (messageCount >= 5) {
            score += 10;
            reasons.push('Engagement élevé (5+ messages)');
        }

        // Check for question marks (indicates interest)
        const questionCount = (text.match(/\?/g) || []).length;
        if (questionCount >= 2) {
            score += 5;
            reasons.push('Pose plusieurs questions');
        }

        // Calculate confidence based on keyword matches and message count
        const keywordConfidence = Math.min(matchedKeywords.length / 5, 1);
        const engagementConfidence = Math.min(messageCount / 5, 1);
        const confidence = (keywordConfidence * 0.7 + engagementConfidence * 0.3);

        return {
            score,
            confidence: Math.round(confidence * 100) / 100,
            matchedKeywords,
            reason: reasons.length > 0 ? reasons.join(', ') : 'Intérêt potentiel détecté'
        };
    }

    /**
     * Create a suggested lead from a conversation
     */
    async createSuggestedLead(userId, conversation, agentId, analysis) {
        try {
            const leadId = uuidv4();
            
            // Get display name from conversation
            const displayName = conversation.saved_contact_name || 
                              conversation.contact_name || 
                              conversation.push_name || 
                              conversation.notify_name || 
                              conversation.contact_number || 
                              'Contact WhatsApp';

            await db.run(`
                INSERT INTO leads (
                    id, user_id, name, phone, source, status, 
                    is_suggested, ai_confidence, ai_reason, 
                    agent_id, conversation_id, notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                leadId,
                userId,
                displayName,
                conversation.contact_number || null,
                'whatsapp',
                'new',
                1,
                analysis.confidence,
                analysis.reason,
                agentId,
                conversation.id,
                `Mots-clés détectés: ${analysis.keywords.slice(0, 5).join(', ')}`
            );

            console.log(`[LeadAnalyzer] Created suggested lead ${leadId} for conversation ${conversation.id}`);

            notificationService.notifyNewLead(userId, displayName, conversation.id);

            void workflowExecutor.executeMatchingWorkflowsSafe('lead_detected', {
                leadId,
                conversationId: conversation.id,
                agentId,
                userId,
                contactJid: conversation.contact_jid,
                contactName: displayName,
                contactNumber: conversation.contact_number,
                confidence: analysis.confidence,
                reason: analysis.reason
            }, agentId, userId);

            return await db.get('SELECT * FROM leads WHERE id = ?', leadId);
        } catch (error) {
            console.error('[LeadAnalyzer] Error creating suggested lead:', error);
            return null;
        }
    }

    async validateLead(leadId, userId) {
        try {
            const lead = await db.get('SELECT * FROM leads WHERE id = ? AND user_id = ?', leadId, userId);
            if (!lead) {
                return { error: 'Lead non trouvé' };
            }

            await db.run(`
                UPDATE leads SET 
                    is_suggested = 0,
                    validated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, leadId);

            return { success: true, message: 'Lead validé' };
        } catch (error) {
            console.error('[LeadAnalyzer] Error validating lead:', error);
            return { error: error.message };
        }
    }

    async rejectLead(leadId, userId) {
        try {
            const lead = await db.get('SELECT * FROM leads WHERE id = ? AND user_id = ?', leadId, userId);
            if (!lead) {
                return { error: 'Lead non trouvé' };
            }

            await db.run(`
                UPDATE leads SET 
                    status = 'rejected',
                    is_suggested = 0,
                    rejected_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, leadId);

            return { success: true, message: 'Lead rejeté' };
        } catch (error) {
            console.error('[LeadAnalyzer] Error rejecting lead:', error);
            return { error: error.message };
        }
    }

    /**
     * Create a lead from a validated order (so the contact appears in leads when order was detected but lead was skipped)
     * @param {Object} order - Order object with conversation_id, customer_name, customer_phone, user_id
     * @returns {Object|null} - Created lead or null
     */
    async createLeadFromOrder(order) {
        try {
            if (!order?.conversation_id || !order?.user_id) {
                return null;
            }
            const existing = await db.get('SELECT id FROM leads WHERE conversation_id = ?', order.conversation_id);
            if (existing) {
                return await db.get('SELECT * FROM leads WHERE id = ?', existing.id);
            }
            const conversation = await db.get('SELECT agent_id, contact_number, contact_name, saved_contact_name, push_name FROM conversations WHERE id = ?', order.conversation_id);
            const agentId = conversation?.agent_id || null;
            const phone = order.customer_phone || conversation?.contact_number || null;
            const name = order.customer_name || conversation?.saved_contact_name || conversation?.contact_name || conversation?.push_name || 'Contact';
            const leadId = uuidv4();
            await db.run(`
                INSERT INTO leads (
                    id, user_id, name, phone, source, status,
                    is_suggested, agent_id, conversation_id, notes
                )
                VALUES (?, ?, ?, ?, 'whatsapp', 'new', 0, ?, ?, ?)
            `, leadId, order.user_id, name, phone, agentId, order.conversation_id, 'Créé à partir de la commande validée');
            console.log(`[LeadAnalyzer] Created lead ${leadId} from validated order (conversation ${order.conversation_id})`);
            return await db.get('SELECT * FROM leads WHERE id = ?', leadId);
        } catch (error) {
            console.error('[LeadAnalyzer] Error creating lead from order:', error);
            return null;
        }
    }

    async getSuggestedLeads(userId) {
        return await db.all(`
            SELECT l.*, c.contact_name, c.contact_number, a.name as agent_name
            FROM leads l
            LEFT JOIN conversations c ON l.conversation_id = c.id
            LEFT JOIN agents a ON l.agent_id = a.id
            WHERE l.user_id = ? AND l.is_suggested = 1
            ORDER BY l.created_at DESC
        `, userId);
    }
}

export const leadAnalyzer = new LeadAnalyzer();
export default leadAnalyzer;
