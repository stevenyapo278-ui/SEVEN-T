/**
 * Appointment Analyzer Service
 * Detects appointment intent and extracts basic slot hints.
 */

const APPOINTMENT_KEYWORDS = [
    'rendez-vous', 'rendez vous', 'rdv', 'appointment', 'réserver', 'reservation',
    'prendre un rendez-vous', 'prendre rdv', 'disponible', 'créneau'
];

const SERVICE_KEYWORDS = {
    consultation: ['consultation', 'conseil'],
    devis: ['devis', 'estimation'],
    visite: ['visite', 'inspection'],
    installation: ['installation', 'pose']
};

const DATE_PATTERNS = [
    /\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/g,
    /\b(aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g
];

const TIME_PATTERN = /\b\d{1,2}h(\d{2})?\b|\b\d{1,2}:\d{2}\b/g;

class AppointmentAnalyzer {
    analyze(payloadOrMessage) {
        const message = (payloadOrMessage && typeof payloadOrMessage === 'object')
            ? payloadOrMessage.message
            : payloadOrMessage;

        if (!message || typeof message !== 'string') {
            return { appointment: { rdvIntent: false, extractedSlots: [], serviceType: null } };
        }

        const lower = message.toLowerCase();
        const rdvIntent = APPOINTMENT_KEYWORDS.some(k => lower.includes(k));

        const extractedSlots = [];
        for (const pattern of DATE_PATTERNS) {
            const matches = lower.match(pattern);
            if (matches) extractedSlots.push(...matches);
        }
        const timeMatches = lower.match(TIME_PATTERN);
        if (timeMatches) extractedSlots.push(...timeMatches);

        let serviceType = null;
        for (const [type, keywords] of Object.entries(SERVICE_KEYWORDS)) {
            if (keywords.some(k => lower.includes(k))) {
                serviceType = type;
                break;
            }
        }

        return { appointment: { rdvIntent, extractedSlots, serviceType } };
    }
}

export default new AppointmentAnalyzer();
