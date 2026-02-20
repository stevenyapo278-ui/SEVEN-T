import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { normalizeJid } from '../utils/whatsappUtils.js';
import { aiLogger } from '../utils/logger.js';

/**
 * Service d'exécution des workflows automatisés
 * Déclenche et exécute les workflows en fonction des événements
 */
/** Max retries for WhatsApp send on timeout (transient errors) */
const SEND_RETRY_ATTEMPTS = 2;
const SEND_RETRY_DELAY_MS = 4000;

function isRetryableSendError(err) {
    const msg = err?.message || '';
    const code = err?.output?.payload?.statusCode;
    return msg.includes('Timed Out') || msg.includes('timeout') || code === 408;
}

class WorkflowExecutor {
    constructor() {
        this.whatsappManager = null; // Will be set after initialization to avoid circular dependency
    }

    /**
     * Set WhatsApp manager reference (called from whatsapp.js after initialization)
     */
    setWhatsAppManager(manager) {
        this.whatsappManager = manager;
    }

    /**
     * Retry send on transient timeout errors (Baileys/WhatsApp can time out intermittently)
     */
    async sendMessageWithRetry(sendFn) {
        let lastErr;
        for (let attempt = 1; attempt <= SEND_RETRY_ATTEMPTS + 1; attempt++) {
            try {
                return await sendFn();
            } catch (err) {
                lastErr = err;
                if (attempt <= SEND_RETRY_ATTEMPTS && isRetryableSendError(err)) {
                    console.warn(`[WorkflowExecutor] Send timeout (attempt ${attempt}/${SEND_RETRY_ATTEMPTS + 1}), retrying in ${SEND_RETRY_DELAY_MS}ms...`);
                    await new Promise(r => setTimeout(r, SEND_RETRY_DELAY_MS));
                } else {
                    throw err;
                }
            }
        }
        throw lastErr;
    }

    /**
     * Find and execute workflows matching a trigger
     * @param {string} triggerType - Type of trigger (new_message, order_created, etc.)
     * @param {object} triggerData - Data associated with the trigger
     * @param {string} agentId - Optional: filter by agent
     * @param {string} userId - User ID for context
     */
    async executeMatchingWorkflows(triggerType, triggerData = {}, agentId = null, userId = null) {
        try {
            if (!userId && triggerData.conversationId) {
                const conv = await db.get(`
                    SELECT a.user_id 
                    FROM conversations c
                    JOIN agents a ON c.agent_id = a.id
                    WHERE c.id = ?
                `, triggerData.conversationId);
                if (conv) userId = conv.user_id;
            }
            if (!userId && agentId) {
                const agent = await db.get('SELECT user_id FROM agents WHERE id = ?', agentId);
                if (agent) userId = agent.user_id;
            }
            if (!userId) {
                console.warn('[WorkflowExecutor] No userId found, skipping workflow execution');
                return { executed: 0, results: [] };
            }

            let workflows;
            if (agentId) {
                workflows = await db.all(`
                    SELECT * FROM workflows 
                    WHERE trigger_type = ? 
                    AND is_active = 1 
                    AND (agent_id = ? OR agent_id IS NULL)
                    AND user_id = ?
                `, triggerType, agentId, userId);
            } else {
                workflows = await db.all(`
                    SELECT * FROM workflows 
                    WHERE trigger_type = ? 
                    AND is_active = 1 
                    AND user_id = ?
                `, triggerType, userId);
            }

            const list = Array.isArray(workflows) ? workflows : [];
            if (list.length === 0) {
                return { executed: 0, results: [] };
            }

            console.log(`[WorkflowExecutor] Found ${list.length} workflows for trigger: ${triggerType}`);

            const results = [];
            for (const workflow of list) {
                try {
                    const result = await this.executeWorkflow(workflow, triggerData);
                    results.push({ workflowId: workflow.id, success: true, result });
                } catch (error) {
                    console.error(`[WorkflowExecutor] Error executing workflow ${workflow.id}:`, error);
                    results.push({ workflowId: workflow.id, success: false, error: error.message });
                }
            }

            return { executed: list.length, results };
        } catch (error) {
            console.error('[WorkflowExecutor] Error in executeMatchingWorkflows:', error);
            throw error;
        }
    }

    /**
     * Safe wrapper for workflow execution (logs errors and never throws)
     */
    async executeMatchingWorkflowsSafe(triggerType, triggerData = {}, agentId = null, userId = null) {
        try {
            return await this.executeMatchingWorkflows(triggerType, triggerData, agentId, userId);
        } catch (error) {
            aiLogger.error('Workflow execution error', {
                triggerType,
                agentId,
                userId,
                error: error?.message || String(error)
            });
            return { executed: 0, results: [], error: error?.message || String(error) };
        }
    }

    /**
     * Execute a single workflow
     */
    async executeWorkflow(workflow, triggerData) {
        console.log(`[WorkflowExecutor] Executing workflow: ${workflow.name} (${workflow.id})`);

        let actions;
        let triggerConfig;
        try {
            const rawActions = workflow.actions;
            const rawTrigger = workflow.trigger_config;
            if (rawActions == null || rawActions === '' || rawActions === 'undefined') {
                actions = [];
            } else {
                const parsed = typeof rawActions === 'string' ? JSON.parse(rawActions) : rawActions;
                actions = Array.isArray(parsed) ? parsed : [];
            }
            if (rawTrigger == null || rawTrigger === '' || rawTrigger === 'undefined') {
                triggerConfig = {};
            } else {
                const parsed = typeof rawTrigger === 'string' ? JSON.parse(rawTrigger) : rawTrigger;
                triggerConfig = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            }
        } catch (e) {
            console.error('[WorkflowExecutor] Parse error for workflow', workflow.id, e);
            throw new Error(`Configuration du workflow invalide: ${e?.message || 'données corrompues'}`);
        }

        // Check trigger conditions if needed
        if (workflow.trigger_type === 'keyword' && triggerConfig.keywords) {
            const keywords = triggerConfig.keywords.toLowerCase().split(',').map(k => k.trim());
            const message = (triggerData.message || '').toLowerCase();
            const hasKeyword = keywords.some(keyword => message.includes(keyword));
            if (!hasKeyword) {
                console.log(`[WorkflowExecutor] Keyword condition not met, skipping workflow ${workflow.id}`);
                return { skipped: true, reason: 'keyword_not_found' };
            }
        }

        const actionResults = [];
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            try {
                console.log(`[WorkflowExecutor] Executing action ${i + 1}/${actions.length}: ${action.type}`);
                const result = await this.executeAction(action, triggerData, workflow);
                actionResults.push({ action: action.type, success: true, result });

                // Handle wait action
                if (action.type === 'wait') {
                    const minutes = action.config?.minutes || 5;
                    console.log(`[WorkflowExecutor] Waiting ${minutes} minutes...`);
                    await new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
                }
            } catch (error) {
                console.error(`[WorkflowExecutor] Error executing action ${action.type}:`, error);
                actionResults.push({ action: action.type, success: false, error: error.message });
                // Continue with next action even if one fails
            }
        }

        // Log execution
        await this.logExecution(workflow.id, triggerData, actionResults);

        return { actionsExecuted: actions.length, results: actionResults };
    }

    /**
     * Execute a single action
     */
    async executeAction(action, triggerData, workflow) {
        const config = action.config || {};

        switch (action.type) {
            case 'send_message':
                return await this.executeSendMessage(config, triggerData, workflow);

            case 'add_tag':
                return await this.executeAddTag(config, triggerData);

            case 'assign_human':
                return await this.executeAssignHuman(triggerData);

            case 'create_lead':
                return await this.executeCreateLead(triggerData, workflow);

            case 'send_notification':
                return await this.executeSendNotification(config, triggerData, workflow);

            case 'wait':
                return { waited: config.minutes || 5 };

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Execute send_message action
     */
    async executeSendMessage(config, triggerData, workflow) {
        if (!this.whatsappManager) {
            throw new Error('WhatsApp manager not initialized');
        }

        let message = config.message || '';
        if (!message.trim() && !config.include_order_summary) {
            throw new Error('Message is empty');
        }

        // Replace variables in message
        let processedMessage = this.replaceVariables(message, triggerData);

        // Option: include automatic order summary (for order_validated / order_created)
        if (config.include_order_summary && (triggerData.orderId || triggerData.orderItems)) {
            const summary = this.buildOrderSummary(triggerData);
            processedMessage = processedMessage.trim()
                ? `${processedMessage.trim()}\n\n${summary}`
                : summary;
        }

        if (!processedMessage.trim()) {
            throw new Error('Message is empty');
        }

        // Determine recipient
        if (config.send_to === 'contact' && config.contact_id) {
            // Send to registered contact
            const contact = await db.get('SELECT * FROM workflow_contacts WHERE id = ?', config.contact_id);
            if (!contact) {
                throw new Error('Contact not found');
            }

            // Format phone number for WhatsApp (ensure it has @s.whatsapp.net)
            const phoneJid = normalizeJid(contact.phone_number);
            if (!phoneJid) {
                throw new Error('Contact phone number is invalid');
            }

            console.log(`[WorkflowExecutor] Sending message to contact ${contact.name} (${phoneJid})`);
            
            // Resolve agent -> tool_id (connections use toolId, not agentId)
            const agentId = workflow.agent_id || triggerData.agentId;
            if (!agentId) {
                throw new Error('No agent specified for sending message');
            }
            const agentRow = await db.get('SELECT tool_id FROM agents WHERE id = ?', agentId);
            const toolId = agentRow?.tool_id;
            if (!toolId) {
                throw new Error('Aucun outil WhatsApp assigné à cet agent. Vérifiez la configuration de l\'agent.');
            }

            await this.whatsappManager.ensureConversationDisplay(toolId, agentId, phoneJid, contact.name, contact.phone_number);
            await this.sendMessageWithRetry(() => this.whatsappManager.sendMessage(toolId, phoneJid, processedMessage));

            return { sent: true, recipient: contact.name, phone: contact.phone_number };
        } else {
            // Send to conversation contact (default)
            const conversationId = triggerData.conversationId;
            if (!conversationId) {
                throw new Error('No conversation ID provided');
            }

            const agentId = workflow.agent_id || triggerData.agentId;
            if (!agentId) {
                throw new Error('No agent specified for sending message');
            }
            const agentRow = await db.get('SELECT tool_id FROM agents WHERE id = ?', agentId);
            const toolId = agentRow?.tool_id;
            if (!toolId) {
                throw new Error('Aucun outil WhatsApp assigné à cet agent. Vérifiez la configuration de l\'agent.');
            }

            await this.sendMessageWithRetry(() => this.whatsappManager.sendMessageAndSave(toolId, conversationId, processedMessage));

            return { sent: true, recipient: 'conversation_contact' };
        }
    }

    /**
     * Execute add_tag action
     */
    async executeAddTag(config, triggerData) {
        const conversationId = triggerData.conversationId;
        if (!conversationId) {
            throw new Error('No conversation ID');
        }

        const tag = config.tag || '';
        if (!tag.trim()) {
            throw new Error('No tag specified');
        }

        // Get current tags
        const conversation = await db.get('SELECT tags FROM conversations WHERE id = ?', conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        let tags = [];
        try {
            tags = conversation.tags ? JSON.parse(conversation.tags) : [];
        } catch (e) {
            tags = [];
        }

        // Add tag if not already present
        if (!tags.includes(tag)) {
            tags.push(tag);
            await db.run('UPDATE conversations SET tags = ? WHERE id = ?', JSON.stringify(tags), conversationId);
        }

        return { added: tag, totalTags: tags.length };
    }

    /**
     * Execute assign_human action
     */
    async executeAssignHuman(triggerData) {
        const conversationId = triggerData.conversationId;
        if (!conversationId) {
            throw new Error('No conversation ID');
        }

        await db.run('UPDATE conversations SET human_takeover = 1 WHERE id = ?', conversationId);

        return { assigned: true };
    }

    /**
     * Execute create_lead action
     */
    async executeCreateLead(triggerData, workflow) {
        const conversationId = triggerData.conversationId;
        if (!conversationId) {
            throw new Error('No conversation ID');
        }

        // Get conversation details
        const conversation = await db.get(`
            SELECT c.*, a.user_id 
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ?
        `, conversationId);

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Check if lead already exists for this conversation
        const existingLead = await db.get('SELECT id FROM leads WHERE conversation_id = ?', conversationId);
        if (existingLead) {
            return { created: false, reason: 'lead_already_exists', leadId: existingLead.id };
        }

        // Create lead
        const leadId = uuidv4();
        await db.run(`
            INSERT INTO leads (id, user_id, agent_id, conversation_id, name, phone, status, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            leadId,
            conversation.user_id,
            conversation.agent_id,
            conversationId,
            conversation.contact_name || 'Lead automatique',
            conversation.contact_number,
            'new',
            'workflow'
        );

        return { created: true, leadId };
    }

    /**
     * Execute send_notification action
     */
    async executeSendNotification(config, triggerData, workflow) {
        const message = config.message || 'Notification workflow';
        const title = config.title || 'Workflow déclenché';

        // Get user for notification
        const userId = workflow.user_id;
        if (!userId) {
            throw new Error('No user ID');
        }

        // Create notification (you can enhance this to send email/SMS/push)
        console.log(`[WorkflowExecutor] Notification for user ${userId}: ${title} - ${message}`);

        // TODO: Integrate with your notification service
        // For now, just log it

        return { notified: true, userId };
    }

    /**
     * Build formatted order summary for delivery (livraison)
     * Lieu: ville/quartier si le client a renseigné
     * Tél: numéro livraison si renseigné, sinon numéro du contact qui a commandé
     */
    buildOrderSummary(data) {
        const lieuParts = [];
        if (data.deliveryCity) lieuParts.push(data.deliveryCity);
        if (data.deliveryNeighborhood) lieuParts.push(data.deliveryNeighborhood);
        const lieuLivraison = lieuParts.length > 0 ? lieuParts.join(', ') : null;
        const telLivraison = data.deliveryPhone || data.customerPhone || data.contactNumber || '—';

        const lines = [
            '📍 RÉCAPITULATIF DE LIVRAISON',
            '',
            `Client: ${data.customerName || data.contactName || '—'}`,
            `Tél: ${telLivraison}`,
            lieuLivraison ? `Lieu: ${lieuLivraison}` : null,
            data.notes ? `Notes: ${data.notes}` : null,
            '',
            'Commandes:',
            data.orderItems || '—',
            '',
            `Total: ${Number(data.totalAmount || 0).toLocaleString()} ${data.currency || 'XOF'}`,
            data.orderIdShort ? `Réf: #${data.orderIdShort}` : null
        ].filter(Boolean);
        return lines.join('\n');
    }

    /**
     * Replace variables in message text
     */
    replaceVariables(text, data) {
        let result = text;

        // Available variables (commande validée / livraison)
        const lieuParts = [];
        if (data.deliveryCity) lieuParts.push(data.deliveryCity);
        if (data.deliveryNeighborhood) lieuParts.push(data.deliveryNeighborhood);
        const lieuLivraison = lieuParts.length > 0 ? lieuParts.join(', ') : '';
        const telLivraison = data.deliveryPhone || data.customerPhone || data.contactNumber || '';

        const variables = {
            '{contact_name}': data.contactName || data.customerName || '',
            '{contact_number}': data.contactNumber || data.customerPhone || '',
            '{customer_name}': data.customerName || data.contactName || '',
            '{customer_phone}': data.customerPhone || data.contactNumber || '',
            '{lieu_livraison}': lieuLivraison,
            '{delivery_phone}': telLivraison,
            '{product_name}': data.productName || '',
            '{order_total}': String(data.totalAmount != null ? Number(data.totalAmount).toLocaleString() : (data.orderTotal || '')),
            '{order_items}': data.orderItems || '',
            '{order_id}': data.orderIdShort || data.orderId || '',
            '{currency}': data.currency || 'XOF',
            '{order_notes}': data.notes || '',
            '{agent_name}': data.agentName || ''
        };

        for (const [variable, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), String(value));
        }

        return result;
    }

    /**
     * Log workflow execution
     */
    async logExecution(workflowId, triggerData, results) {
        try {
            const logId = uuidv4();
            const success = results.every(r => r.success);
            const conversationId = triggerData?.conversationId || null;
            const status = success ? 'success' : 'failed';

            await db.run(`
                INSERT INTO workflow_logs (id, workflow_id, conversation_id, status, trigger_data, result, success, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
                logId,
                workflowId,
                conversationId,
                status,
                JSON.stringify(triggerData),
                JSON.stringify(results),
                success ? 1 : 0
            );
        } catch (error) {
            console.error('[WorkflowExecutor] Error logging execution:', error);
        }
    }
}

export const workflowExecutor = new WorkflowExecutor();

// Alias for backward compatibility
workflowExecutor.executeWorkflows = workflowExecutor.executeMatchingWorkflows;

export default workflowExecutor;
