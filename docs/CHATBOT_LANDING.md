# Landing Chatbot – Architecture & Guide

## Overview

Conversion-oriented chatbot on the SaaS landing page. It welcomes visitors, answers questions, and drives sign-up, demo requests, and feature discovery. Works in **English** and **French**; easily extensible to other languages.

---

## Architecture

```
┌─────────────────┐     POST/GET /api/landing-chat      ┌──────────────────────┐
│  Landing page   │ ───────────────────────────────────► │  Node.js (Express)    │
│  (React)        │                                      │  landingChat.js       │
│  LandingChatbot │ ◄─────────────────────────────────── │  - In-memory sessions │
└─────────────────┘     { reply, quickReplies, sessionId }  - Optional OpenAI    │
                                                          │  - landing_chat_leads│
                                                          └──────────────────────┘
```

- **Frontend**: `frontend/src/components/LandingChatbot.jsx` – floating button, drawer, messages, input, quick-reply chips.
- **Backend**: `backend/routes/landingChat.js` – session handling, predefined replies, optional LLM, lead storage.
- **DB**: Table `landing_chat_leads` (id, session_id, email, phone, language, message_count, created_at).

---

## UX Flow

1. **Entry**: Visitor sees the landing page; chatbot bubble appears bottom-right.
2. **Open**: User clicks the bubble → drawer opens.
3. **Auto welcome**: After 2.5s, first message is sent (welcome + 4 quick replies).
4. **Actions**: User can:
   - Click a quick reply (Create account, Request demo, See features, Contact support).
   - Type a free-text message (handled by rules + optional OpenAI).
5. **Conversion**: “Create account” / “Go to sign up” → redirect to `/register`. Optional: capture email/WhatsApp via `contact: { email?, phone? }` in POST body; lead saved to `landing_chat_leads`.
6. **History**: Session stored in memory (24h TTL); `sessionId` persisted in `localStorage` so refresh keeps context.

---

## API

### POST `/api/landing-chat`

**Body (JSON):**

| Field       | Type   | Description                                  |
|------------|--------|----------------------------------------------|
| sessionId  | string | Optional. Created if omitted.                |
| message    | string | Optional. User free-text message.           |
| language   | string | Optional. `en` or `fr` (default `en`).      |
| action     | string | Optional. `create_account`, `request_demo`, `contact_support`, `see_features`. |
| contact    | object | Optional. `{ email?, phone? }` for lead capture. |

**Response:** `{ sessionId, reply, quickReplies?, leadCaptured? }`

- First call with no `message` and no existing messages → returns welcome + quick replies and creates session.
- With `action` → returns short reply + new quick replies (e.g. “Go to sign up”).
- With `message` → rule-based or LLM reply + quick replies.
- With `contact` → lead saved, thank-you message, optional quick replies.

### GET `/api/landing-chat/welcome?language=en`

Returns `{ reply, quickReplies }` for the welcome only (no session creation). Useful for server-side or alternate clients.

---

## Optional LLM (OpenAI)

If `OPENAI_API_KEY` is set, free-text user messages are sent to **gpt-4o-mini** with a short system prompt (conversion-focused, 1–2 sentences, language from `language`). On failure or missing key, a **fallback** reply is used (e.g. “I’m not sure I understood. You can create a free account…”).

---

## i18n

- **Backend**: Replies and quick-reply labels in `defaultReplies.en` / `defaultReplies.fr` in `landingChat.js`.
- **Frontend**: UI strings in `chatbot.*` in `fr.json` / `en.json` (placeholder, send, open, error, etc.). Language is taken from `i18n.language`.

To add a language: add a key in `defaultReplies` and use the same `language` value in the API; add `chatbot.*` keys in the new locale file.

---

## Example Conversation

```
Bot: Hi! 👋 I'm here to help you discover SEVEN T. We automate WhatsApp...
     [Create account] [Request a demo] [See features] [Contact support]

User: [Clicks "Request a demo"]

Bot: I'd be happy to arrange a demo. You can sign up and we'll get in touch...
     [Sign up] [See features]

User: [Clicks "Sign up"]  →  redirect to /register
```

---

## Conversion & Optimization Tips

1. **Keep the first message short** and end with a clear question or CTAs.
2. **Quick replies** reduce friction; keep labels short and action-oriented.
3. **Lead capture**: Add a step or chip “Leave my email for a demo” and send `contact: { email }`; backend saves to `landing_chat_leads`.
4. **A/B testing**: Vary welcome delay (e.g. 2s vs 4s), welcome copy, or order of quick replies; track open rate and conversion by variant.
5. **Analytics**: Log `sessionId`, `action`, and `leadCaptured` (or use existing analytics) to measure chatbot → sign-up / demo.
6. **Fallback**: Always show a clear path (e.g. “Create account”, “See features”) when the bot doesn’t understand.

---

## Security & Privacy

- **No auth** required for `/api/landing-chat` (public landing).
- **Rate limiting**: Covered by global `apiLimiter` on `/api`.
- **Data**: Only what the user sends (message, optional email/phone). Stored in memory (sessions) and in `landing_chat_leads`. Comply with your privacy policy and consent (e.g. mention in the chat or footer).

---

## Possible Extensions

- **E-commerce variant**: Add product-related intents and links to catalog or pricing.
- **WhatsApp / multicanal**: Add “Contact us on WhatsApp” quick reply with `wa.me/…` or save phone to `landing_chat_leads` and trigger a workflow.
- **n8n**: Webhook on `landing_chat_leads` insert (or on specific actions) to push leads into n8n for CRM, email, or demo scheduling.
- **Admin UI**: List and export `landing_chat_leads` in the dashboard or admin panel.
