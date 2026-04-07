import db from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { whatsappManager } from './whatsapp.js';

/**
 * Core logic to send a campaign.
 * Can be called manually from route or automatically from scheduler.
 */
export async function sendCampaign(campaignId) {
    const campaign = await db.get(`
        SELECT c.*, a.whatsapp_connected, a.tool_id
        FROM campaigns c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.id = ?
    `, campaignId);

    if (!campaign) {
        throw new Error('Campagne non trouvée');
    }

    if (!campaign.whatsapp_connected) {
        throw new Error('WhatsApp non connecté pour cet agent');
    }

    if (campaign.status === 'sent' || campaign.status === 'sending') {
        return { message: 'Campagne déjà envoyée ou en cours d\'envoi', already_sent: true };
    }

    const recipients = await db.all("SELECT * FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'", campaignId);

    if (recipients.length === 0) {
        await db.run("UPDATE campaigns SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?", campaignId);
        return { message: 'Aucun destinataire en attente', count: 0 };
    }

    // Mark as sending to avoid double triggers
    await db.run("UPDATE campaigns SET status = 'sending' WHERE id = ?", campaignId);

    const toolId = campaign.tool_id || campaign.agent_id;
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
        try {
            let messageText = campaign.message;
            if (recipient.contact_name) {
                messageText = messageText.replace(/\{\{nom\}\}/g, recipient.contact_name).replace(/\{\{name\}\}/g, recipient.contact_name);
            }
            messageText = messageText.replace(/\{\{telephone\}\}/g, recipient.contact_number || '').replace(/\{\{phone\}\}/g, recipient.contact_number || '');
            
            await whatsappManager.sendAutomatedMessageAndSave(toolId, recipient.contact_number, messageText, { messageType: 'campaign' });
            
            await db.run("UPDATE campaign_recipients SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?", recipient.id);
            sent++;
            
            // Random delay between messages (5 to 10 seconds) to avoid WhatsApp bans
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        } catch (error) {
            console.error(`[Campaign ${campaignId}] Failed to send to ${recipient.contact_number}:`, error.message);
            await db.run("UPDATE campaign_recipients SET status = 'failed', error_message = ? WHERE id = ?", error.message || String(error), recipient.id);
            failed++;
        }
    }

    await db.run(`
        UPDATE campaigns 
        SET status = 'sent', 
            sent_at = CURRENT_TIMESTAMP,
            sent_count = ?,
            failed_count = ?
        WHERE id = ?
    `, sent, failed, campaignId);

    console.log(`[Campaign] ${campaign.name} finished: ${sent} sent, ${failed} failed`);
    return { sent, failed };
}

/**
 * Helper to calculate the next run date for recurring campaigns.
 * @param {Date} date - Current scheduled date
 * @param {string} type - 'daily', 'weekly', 'monthly'
 * @param {number} interval - Interval (every X days/weeks/months)
 * @param {string} days - Comma-separated days of week for weekly (0=Sun, 1=Mon, ..., 6=Sat)
 */
function calculateNextRunAt(date, type, interval, days) {
    const next = new Date(date);
    const step = interval || 1;

    if (type === 'daily') {
        next.setDate(next.getDate() + step);
    } else if (type === 'weekly') {
        if (days && days.trim()) {
            const allowedDays = days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)).sort();
            const currentDay = next.getDay();
            const nextDayInWeek = allowedDays.find(d => d > currentDay);

            if (nextDayInWeek !== undefined) {
                next.setDate(next.getDate() + (nextDayInWeek - currentDay));
            } else {
                // Advance to first allowed day of the next interval week
                const daysUntilNextWeek = 7 - currentDay + allowedDays[0];
                next.setDate(next.getDate() + daysUntilNextWeek + (7 * (step - 1)));
            }
        } else {
            next.setDate(next.getDate() + (7 * step));
        }
    } else if (type === 'monthly') {
        next.setMonth(next.getMonth() + step);
    } else {
        return null;
    }
    return next;
}

/**
 * Job that finds and runs scheduled campaigns.
 */
export async function runCampaignSchedulerJob() {
    try {
        // Find campaigns scheduled in the past that are still in 'scheduled' status
        const scheduledCampaigns = await db.all(`
            SELECT id, name, recurrence_type, recurrence_interval, recurrence_days, scheduled_at 
            FROM campaigns 
            WHERE status = 'scheduled' 
            AND scheduled_at <= CURRENT_TIMESTAMP
        `);

        if (scheduledCampaigns.length > 0) {
            console.log(`[CampaignScheduler] Found ${scheduledCampaigns.length} campaign(s) to process`);
        }

        for (const camp of scheduledCampaigns) {
            console.log(`[CampaignScheduler] Starting automatic send for: ${camp.name} (${camp.id})`);
            try {
                // Execute sending
                await sendCampaign(camp.id);

                // Handle recurrence
                if (camp.recurrence_type && camp.recurrence_type !== 'none') {
                    const nextRun = calculateNextRunAt(
                        new Date(camp.scheduled_at),
                        camp.recurrence_type,
                        camp.recurrence_interval,
                        camp.recurrence_days
                    );

                    if (nextRun) {
                        console.log(`[CampaignScheduler] Rescheduling recurring campaign ${camp.name} for ${nextRun.toISOString()}`);
                        
                        await db.transaction(async (tx) => {
                            // Update campaign to next scheduled date
                            await tx.run(`
                                UPDATE campaigns 
                                SET status = 'scheduled',
                                    scheduled_at = ?,
                                    next_run_at = ?,
                                    sent_at = NULL
                                WHERE id = ?
                            `, nextRun, nextRun, camp.id);

                            // Reset recipients to pending for the next run
                            await tx.run(`
                                UPDATE campaign_recipients 
                                SET status = 'pending',
                                    sent_at = NULL,
                                    error_message = NULL
                                WHERE campaign_id = ?
                            `, camp.id);
                        });
                    }
                }
            } catch (err) {
                console.error(`[CampaignScheduler] Error processing campaign ${camp.id}:`, err.message);
                // Optionally update status to failed if core error
                if (!camp.recurrence_type || camp.recurrence_type === 'none') {
                    await db.run("UPDATE campaigns SET status = 'failed' WHERE id = ?", camp.id);
                }
            }
        }
    } catch (error) {
        console.error('[CampaignScheduler] Job error:', error.message);
    }
}
