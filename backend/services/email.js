/**
 * Email Service for SEVEN T SaaS
 * Handles transactional emails (welcome, password reset, notifications, etc.)
 */

import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
    from: process.env.EMAIL_FROM || 'SEVEN T <noreply@seven-t.com>',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@seven-t.com',
};

// Company branding for emails
const BRANDING = {
    name: 'SEVEN T',
    logo: 'https://seven-t.com/logo.png', // Update with actual logo URL
    color: '#FBBF24', // Gold color
    website: process.env.FRONTEND_URL || 'http://localhost:5173',
};

/**
 * Create email transporter based on environment
 */
function createTransporter() {
    // Production: Use SMTP settings from env
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    
    // Development: Use ethereal.email (fake SMTP for testing)
    console.log('⚠️  No SMTP configured. Emails will be logged to console.');
    return null;
}

const transporter = createTransporter();

/**
 * Base email template with responsive design
 */
function baseTemplate(content, preheader = '') {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${BRANDING.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; }
        .header { padding: 30px; text-align: center; background: linear-gradient(135deg, #8b5cf6 0%, #fbbf24 100%); }
        .logo { font-size: 28px; font-weight: bold; color: #0f0f23; letter-spacing: 1px; }
        .content { padding: 40px 30px; color: #e5e5e5; line-height: 1.6; }
        .button { display: inline-block; padding: 14px 28px; background-color: #fbbf24; color: #0f0f23; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { background-color: #f59e0b; }
        .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #2d2d44; }
        .footer a { color: #fbbf24; text-decoration: none; }
        h1 { color: #ffffff; margin: 0 0 20px 0; font-size: 24px; }
        p { margin: 0 0 15px 0; }
        .preheader { display: none; max-height: 0; overflow: hidden; }
        .stats-box { background-color: #0f0f23; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .stat { display: inline-block; text-align: center; padding: 10px 20px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #fbbf24; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .warning { background-color: #451a03; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .success { background-color: #052e16; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    </style>
</head>
<body>
    <span class="preheader">${preheader}</span>
    <div class="container">
        <div class="header">
            <div class="logo">SEVEN<span style="color: #0f0f23;">·</span>T</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>${BRANDING.name} - Automatisation WhatsApp intelligente</p>
            <p>
                <a href="${BRANDING.website}">Site web</a> · 
                <a href="${BRANDING.website}/legal?tab=privacy">Confidentialité</a> · 
                <a href="${BRANDING.website}/legal?tab=terms">CGU</a>
            </p>
            <p style="margin-top: 15px; font-size: 11px;">
                Vous recevez cet email car vous avez un compte ${BRANDING.name}.<br>
                © ${new Date().getFullYear()} ${BRANDING.name}. Tous droits réservés.
            </p>
        </div>
    </div>
</body>
</html>
`;
}

/**
 * Send an email
 */
async function sendEmail({ to, subject, html, text }) {
    const mailOptions = {
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    // If no transporter (dev mode), just log
    if (!transporter) {
        console.log('\n📧 Email (not sent - no SMTP configured):');
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Preview: ${html.substring(0, 200)}...`);
        return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==================== EMAIL TEMPLATES ====================

/**
 * Welcome email for new users
 */
export async function sendWelcomeEmail(user) {
    const content = `
        <h1>Bienvenue sur ${BRANDING.name} ! 🎉</h1>
        <p>Bonjour ${user.name},</p>
        <p>Merci de nous avoir rejoint ! Votre compte a été créé avec succès.</p>
        <p>Vous pouvez maintenant :</p>
        <ul>
            <li>✅ Créer votre premier agent IA</li>
            <li>✅ Connecter votre WhatsApp</li>
            <li>✅ Automatiser vos conversations</li>
        </ul>
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard" class="button">Accéder au tableau de bord</a>
        </p>
        <p>Vous disposez de <strong>${user.credits || 100} crédits gratuits</strong> pour démarrer.</p>
        <p>Des questions ? Répondez directement à cet email, nous sommes là pour vous aider !</p>
        <p>L'équipe ${BRANDING.name}</p>
    `;

    return sendEmail({
        to: user.email,
        subject: `Bienvenue sur ${BRANDING.name} ! 🚀`,
        html: baseTemplate(content, 'Votre compte a été créé avec succès.'),
    });
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${BRANDING.website}/reset-password?token=${resetToken}`;
    
    const content = `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Bonjour ${user.name},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
        </p>
        <p><small>Ce lien expire dans 1 heure.</small></p>
        <div class="warning">
            <strong>⚠️ Si vous n'avez pas demandé cette réinitialisation</strong>, ignorez cet email.
            Votre mot de passe restera inchangé.
        </div>
    `;

    return sendEmail({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe',
        html: baseTemplate(content, 'Demande de réinitialisation de mot de passe.'),
    });
}

/**
 * Low credits warning
 */
export async function sendLowCreditsEmail(user, creditsRemaining) {
    const content = `
        <h1>Crédits bientôt épuisés ⚠️</h1>
        <p>Bonjour ${user.name},</p>
        <p>Il vous reste <strong>${creditsRemaining} crédits</strong> sur votre compte ${BRANDING.name}.</p>
        <div class="warning">
            <strong>Attention :</strong> Vos agents IA ne pourront plus répondre une fois vos crédits épuisés.
        </div>
        <p>Pour continuer à automatiser vos conversations, vous pouvez :</p>
        <ul>
            <li>🔄 Attendre le renouvellement mensuel (si vous êtes abonné)</li>
            <li>⬆️ Passer à un plan supérieur avec plus de crédits</li>
        </ul>
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard/settings" class="button">Voir mes options</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `⚠️ Il vous reste ${creditsRemaining} crédits`,
        html: baseTemplate(content, `Attention : il vous reste ${creditsRemaining} crédits.`),
    });
}

/**
 * Credits exhausted
 */
export async function sendCreditsExhaustedEmail(user) {
    const content = `
        <h1>Crédits épuisés 🛑</h1>
        <p>Bonjour ${user.name},</p>
        <p>Vos crédits ${BRANDING.name} sont maintenant épuisés.</p>
        <div class="warning">
            <strong>Impact :</strong> Vos agents IA ne peuvent plus générer de réponses automatiques.
            Les messages reçus recevront une réponse de secours.
        </div>
        <p>Pour restaurer le service complet :</p>
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard/settings" class="button">Upgrader mon plan</a>
        </p>
        <p><small>Votre plan sera automatiquement renouvelé à la prochaine période de facturation si vous êtes abonné.</small></p>
    `;

    return sendEmail({
        to: user.email,
        subject: '🛑 Vos crédits sont épuisés',
        html: baseTemplate(content, 'Vos crédits sont épuisés. Vos agents sont en pause.'),
    });
}

/**
 * WhatsApp disconnection alert
 */
export async function sendWhatsAppDisconnectedEmail(user, agentName) {
    const content = `
        <h1>Agent déconnecté de WhatsApp</h1>
        <p>Bonjour ${user.name},</p>
        <p>Votre agent <strong>"${agentName}"</strong> a été déconnecté de WhatsApp.</p>
        <div class="warning">
            <strong>Cause possible :</strong> Session expirée, déconnexion manuelle depuis WhatsApp, ou limite WhatsApp atteinte.
        </div>
        <p>Pour reconnecter votre agent :</p>
        <ol>
            <li>Allez dans les paramètres de l'agent</li>
            <li>Cliquez sur "Générer le QR Code"</li>
            <li>Scannez le code avec WhatsApp sur votre téléphone</li>
        </ol>
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard/agents" class="button">Reconnecter maintenant</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `⚠️ Agent "${agentName}" déconnecté de WhatsApp`,
        html: baseTemplate(content, `Votre agent "${agentName}" a été déconnecté.`),
    });
}

/**
 * Weekly summary email
 */
export async function sendWeeklySummaryEmail(user, stats) {
    const content = `
        <h1>Votre récapitulatif hebdomadaire 📊</h1>
        <p>Bonjour ${user.name},</p>
        <p>Voici un aperçu de l'activité de vos agents cette semaine :</p>
        
        <div class="stats-box">
            <div class="stat">
                <div class="stat-value">${stats.conversations || 0}</div>
                <div class="stat-label">Conversations</div>
            </div>
            <div class="stat">
                <div class="stat-value">${stats.messages || 0}</div>
                <div class="stat-label">Messages</div>
            </div>
            <div class="stat">
                <div class="stat-value">${stats.creditsUsed || 0}</div>
                <div class="stat-label">Crédits utilisés</div>
            </div>
        </div>
        
        ${stats.topQuestions?.length > 0 ? `
        <p><strong>Questions les plus fréquentes :</strong></p>
        <ul>
            ${stats.topQuestions.map(q => `<li>${q}</li>`).join('')}
        </ul>
        ` : ''}
        
        <div class="success">
            <strong>💡 Conseil :</strong> Ajoutez ces questions à votre base de connaissances pour améliorer les réponses !
        </div>
        
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard" class="button">Voir le tableau de bord</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `📊 Récap hebdo : ${stats.conversations || 0} conversations cette semaine`,
        html: baseTemplate(content, 'Votre récapitulatif hebdomadaire est arrivé !'),
    });
}

/**
 * Payment successful
 */
export async function sendPaymentSuccessEmail(user, invoice) {
    const content = `
        <h1>Paiement confirmé ✅</h1>
        <p>Bonjour ${user.name},</p>
        <p>Votre paiement a été traité avec succès.</p>
        
        <div class="stats-box">
            <p><strong>Détails de la facture :</strong></p>
            <p>Plan : ${invoice.planName}</p>
            <p>Montant : ${invoice.amount} €</p>
            <p>Date : ${invoice.date}</p>
            <p>N° Facture : ${invoice.number}</p>
        </div>
        
        <div class="success">
            <strong>Vos crédits ont été rechargés !</strong><br>
            Vous disposez maintenant de ${invoice.credits} crédits.
        </div>
        
        <p><small>Vous pouvez télécharger votre facture depuis votre espace client.</small></p>
    `;

    return sendEmail({
        to: user.email,
        subject: `✅ Paiement confirmé - Facture ${invoice.number}`,
        html: baseTemplate(content, 'Votre paiement a été traité avec succès.'),
    });
}

/**
 * Payment failed
 */
export async function sendPaymentFailedEmail(user, reason) {
    const content = `
        <h1>Échec du paiement ❌</h1>
        <p>Bonjour ${user.name},</p>
        <p>Nous n'avons pas pu traiter votre paiement.</p>
        
        <div class="warning">
            <strong>Raison :</strong> ${reason || 'Carte refusée ou informations incorrectes.'}
        </div>
        
        <p>Pour éviter toute interruption de service :</p>
        <ol>
            <li>Vérifiez que votre carte est valide et suffisamment approvisionnée</li>
            <li>Mettez à jour vos informations de paiement</li>
        </ol>
        
        <p style="text-align: center;">
            <a href="${BRANDING.website}/dashboard/settings" class="button">Mettre à jour le paiement</a>
        </p>
        
        <p><small>Si le problème persiste, contactez-nous à ${EMAIL_CONFIG.replyTo}</small></p>
    `;

    return sendEmail({
        to: user.email,
        subject: '❌ Échec du paiement - Action requise',
        html: baseTemplate(content, 'Votre paiement a échoué. Action requise.'),
    });
}

/**
 * Automatic report email
 */
export async function sendReportEmail(email, name, report) {
    const formatChange = (val) => {
        if (val > 0) return `<span style="color: #22c55e;">+${val}%</span>`;
        if (val < 0) return `<span style="color: #ef4444;">${val}%</span>`;
        return '<span style="color: #6b7280;">0%</span>';
    };

    const periodLabel = report.period.type === 'month' ? 'mensuel' : 
                        report.period.type === 'day' ? 'quotidien' : 'hebdomadaire';

    const content = `
        <h1>Votre rapport ${periodLabel} 📊</h1>
        <p>Bonjour ${name},</p>
        <p>Voici le récapitulatif de votre activité du ${report.period.start} au ${report.period.end} :</p>
        
        <div class="stats-box" style="text-align: center;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 15px; text-align: center;">
                        <div class="stat-value">${report.messages.total}</div>
                        <div class="stat-label">Messages ${formatChange(report.messages.change)}</div>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <div class="stat-value">${report.conversations.total}</div>
                        <div class="stat-label">Conversations ${formatChange(report.conversations.change)}</div>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <div class="stat-value">${report.leads.total}</div>
                        <div class="stat-label">Leads ${formatChange(report.leads.change)}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 15px; text-align: center;">
                        <div class="stat-value">${report.orders.total}</div>
                        <div class="stat-label">Commandes ${formatChange(report.orders.change)}</div>
                    </td>
                    <td style="padding: 15px; text-align: center;" colspan="2">
                        <div class="stat-value" style="color: #22c55e;">${report.revenue.total.toLocaleString()} FCFA</div>
                        <div class="stat-label">Revenus ${formatChange(report.revenue.change)}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        ${report.topProducts?.length > 0 ? `
        <p><strong>🏆 Produits les plus vendus :</strong></p>
        <ol style="background: #0f0f23; padding: 15px 15px 15px 35px; border-radius: 8px;">
            ${report.topProducts.map(p => `<li style="margin-bottom: 5px;">${p.name} - ${p.sold} vendus (${p.revenue?.toLocaleString() || 0} FCFA)</li>`).join('')}
        </ol>
        ` : ''}
        
        ${report.peakHours?.length > 0 ? `
        <p><strong>⏰ Heures de pointe :</strong></p>
        <p style="background: #0f0f23; padding: 15px; border-radius: 8px;">
            ${report.peakHours.map(h => `${h.hour}h (${h.count} messages)`).join(' · ')}
        </p>
        ` : ''}
        
        ${report.agentPerformance?.length > 0 ? `
        <p><strong>🤖 Performance des agents :</strong></p>
        <table style="width: 100%; background: #0f0f23; border-radius: 8px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #2d2d44;">
                <th style="padding: 10px; text-align: left; color: #fbbf24;">Agent</th>
                <th style="padding: 10px; text-align: center; color: #fbbf24;">Conversations</th>
                <th style="padding: 10px; text-align: center; color: #fbbf24;">Messages</th>
            </tr>
            ${report.agentPerformance.map(a => `
                <tr>
                    <td style="padding: 10px;">${a.name}</td>
                    <td style="padding: 10px; text-align: center;">${a.conversations}</td>
                    <td style="padding: 10px; text-align: center;">${a.messages}</td>
                </tr>
            `).join('')}
        </table>
        ` : ''}
        
        <div class="success" style="margin-top: 20px;">
            <strong>💡 Conseil :</strong> Analysez vos heures de pointe pour optimiser vos réponses automatiques !
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="${BRANDING.website}/dashboard/analytics" class="button">Voir les analytics complets</a>
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            Vous recevez ce rapport car vous l'avez activé dans vos paramètres. 
            <a href="${BRANDING.website}/dashboard/settings" style="color: #fbbf24;">Modifier la fréquence</a>
        </p>
    `;

    return sendEmail({
        to: email,
        subject: `📊 Rapport ${periodLabel} SEVEN T - ${report.messages.total} messages, ${report.revenue.total.toLocaleString()} FCFA`,
        html: baseTemplate(content, `Votre rapport ${periodLabel} est arrivé !`),
    });
}

export default {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendLowCreditsEmail,
    sendCreditsExhaustedEmail,
    sendWhatsAppDisconnectedEmail,
    sendWeeklySummaryEmail,
    sendPaymentSuccessEmail,
    sendPaymentFailedEmail,
    sendReportEmail,
};
