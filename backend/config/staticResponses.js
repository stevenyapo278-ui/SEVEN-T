/**
 * Static responses for known intents.
 * Used to reply without calling the LLM for simple, well-understood intents.
 * Keys must match intent_hint from messageAnalyzer (e.g. greeting, thank_you).
 */
export const staticResponses = {
    greeting: "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
    // Add more as needed, e.g. thank_you: 'De rien !'
};
