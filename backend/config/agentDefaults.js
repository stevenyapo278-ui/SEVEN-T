/**
 * Agent default settings (single source of truth)
 * Keep aligned with database defaults in database/init.js
 */

export const agentDefaults = {
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    max_tokens: 500,
    response_delay: 10,
    auto_reply: 1
};

export default agentDefaults;
