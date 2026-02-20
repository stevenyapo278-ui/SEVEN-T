/**
 * FAQ Analyzer Service
 * Categorizes frequent questions for FAQ templates.
 */

const FAQ_CATEGORIES = {
    hours: ['horaire', 'horaires', 'ouverture', 'fermeture', 'ouvert', 'fermé'],
    location: ['adresse', 'où', 'localisation', 'situer', 'situé', 'map'],
    pricing: ['prix', 'tarif', 'coût', 'combien'],
    contact: ['contact', 'joindre', 'téléphone', 'email', 'mail', 'whatsapp'],
    delivery: ['livraison', 'délai', 'expédition', 'frais', 'shipping'],
    payment: ['paiement', 'payer', 'carte', 'mobile money', 'virement', 'cash']
};

class FaqAnalyzer {
    analyze(payloadOrMessage) {
        const message = (payloadOrMessage && typeof payloadOrMessage === 'object')
            ? payloadOrMessage.message
            : payloadOrMessage;

        if (!message || typeof message !== 'string') {
            return { faq: { category: 'other', suggestedTopics: [] } };
        }

        const lower = message.toLowerCase();

        let category = 'other';
        let maxHits = 0;
        for (const [cat, keywords] of Object.entries(FAQ_CATEGORIES)) {
            const hits = keywords.filter(k => lower.includes(k)).length;
            if (hits > maxHits) {
                maxHits = hits;
                category = cat;
            }
        }

        const suggestedTopics = category !== 'other' ? [category] : [];
        return { faq: { category, suggestedTopics } };
    }
}

export default new FaqAnalyzer();
