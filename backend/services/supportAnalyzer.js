/**
 * Support Analyzer Service
 * Detects support-related intent, urgency, and category.
 */

const SUPPORT_PATTERNS = {
    technical: ['bug', 'erreur', 'panne', 'ne fonctionne pas', 'impossible', 'planté', 'crash', 'down'],
    delivery: ['livraison', 'pas reçu', 'en retard', 'retard', 'colis', 'expédition', 'suivi', 'tracking'],
    refund: ['remboursement', 'rembourser', 'retour', 'retourner', 'échange', 'échanger'],
    complaint: ['réclamation', 'mécontent', 'pas content', 'insatisfait', 'déçu', 'arnaque', 'scandale'],
    account: ['compte', 'connexion', 'mot de passe', 'login', 'inscription', 'profil']
};

const URGENCY_KEYWORDS = [
    'urgent', 'immédiatement', 'tout de suite', 'asap', 'urgence', 'au plus vite'
];

class SupportAnalyzer {
    analyze(payloadOrMessage) {
        const message = (payloadOrMessage && typeof payloadOrMessage === 'object')
            ? payloadOrMessage.message
            : payloadOrMessage;

        if (!message || typeof message !== 'string') {
            return { support: { ticketIntent: false, urgency: 'low', category: 'other' } };
        }

        const lower = message.toLowerCase();

        let category = 'other';
        let maxHits = 0;
        for (const [cat, keywords] of Object.entries(SUPPORT_PATTERNS)) {
            const hits = keywords.filter(k => lower.includes(k)).length;
            if (hits > maxHits) {
                maxHits = hits;
                category = cat;
            }
        }

        const urgency = URGENCY_KEYWORDS.some(k => lower.includes(k)) ? 'high' : 'low';
        const ticketIntent = maxHits > 0 || urgency === 'high';

        const support = { ticketIntent, urgency, category };

        const needsHuman = (category === 'refund' || category === 'complaint')
            ? { needed: true, reasons: ['Demande sensible ou réclamation détectée'] }
            : undefined;

        const result = { support };
        if (needsHuman) result.needsHuman = needsHuman;
        return result;
    }
}

export default new SupportAnalyzer();
