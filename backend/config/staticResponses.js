/**
 * Static responses for known intents.
 * Used to reply without calling the LLM for simple, well-understood intents.
 * Keys must match intent_hint from messageAnalyzer (e.g. greeting, thank_you).
 *
 * For variability, values can be arrays — a random item will be picked.
 */

/** Pick a random item from array, or return the string directly */
export function pickResponse(value) {
    if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
    }
    return value;
}

export const staticResponses = {
    greeting: [
        "Bonjour ! Comment puis-je vous aider ?",
        "Salut ! Qu'est-ce que je peux faire pour vous ?",
        "Bonjour ! Je suis là pour vous aider. 😊",
        "Hello ! Comment puis-je vous être utile ?"
    ],
    // Short affirmations (👍, "ok", "ouais", "top") — handled by shortMessageResponses below
};

/**
 * Ultra-short static responses for very short messages (emojis, single words).
 * These avoid an unnecessary LLM call for trivial inputs.
 * Keys: lowercase normalized message content.
 */
export const shortMessagePatterns = [
    // Emojis positifs
    { pattern: /^[👍🙏😊✅👌🤝💯🔥❤️😁😄🥰]+$/u, responses: ['😊', 'Super !', '👍', 'Avec plaisir !'] },
    // Merci / Thanks
    { pattern: /^(merci|merci beaucoup|thank you|thanks|thx|tks|tk|mci)[\s!.]*$/i, responses: ['De rien ! 😊', 'Avec plaisir !', 'À votre service !', 'De rien, bonne journée ! 🙏'] },
    // Ok confirmations
    { pattern: /^(ok|okay|ok ok|d'accord|oki|okok|oke|k|kk)[\s!.]*$/i, responses: ['Parfait !', 'Noté !', 'Super !', 'Bien reçu !'] },
    // Oui simple
    { pattern: /^(oui|ouais|yes|yep|yop|ouep|ui)[\s!.]*$/i, responses: ['Noté ! 👍', 'D\'accord !', 'Entendu !'] },
    // Non simple
    { pattern: /^(non|no|nope|nan|nein)[\s!.]*$/i, responses: ['Pas de souci !', 'D\'accord, n\'hésitez pas si vous changez d\'avis.'] },
    // Super / Top / Cool
    { pattern: /^(super|top|cool|nickel|parfait|excellent|génial|classe|sympa)[\s!.]*$/i, responses: ['😊', 'Tant mieux !', 'Super ! 🎉'] },
    // Bonne journée / soirée
    { pattern: /^(bonne? (journ[ée]e?|soir[ée]e?|nuit|semaine|weekend)|bisous?|ciao|bye|au revoir|bonne continuation)[\s!.]*$/i, responses: ['À bientôt ! 😊', 'Bonne journée à vous aussi !', 'Au revoir ! Passez une excellente journée. 😊'] },
];
