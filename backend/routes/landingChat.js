/**
 * Landing page chatbot API – conversion-oriented, no auth required.
 * Sessions in memory; optional LLM for open-ended messages; leads saved to DB.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import db from '../database/init.js';

const router = Router();

// In-memory sessions: { sessionId: { messages, step, email?, phone?, createdAt } }
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const WELCOME_DELAY_MS = 2500;

// Optional OpenAI for open-ended user messages (no agent credits)
let openaiClient = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key') {
  try {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (e) {
    console.warn('[landing-chat] OpenAI client init failed:', e?.message);
  }
}

const defaultReplies = {
  en: {
    welcome: "Hi! 👋 I'm here to help you discover SEVEN T. We automate WhatsApp conversations with AI so you can respond to customers 24/7. What would you like to do?",
    fallback: "I'm not sure I understood. You can create a free account, request a demo, or ask about our features. What would you like?",
    create_account: "Great choice! You can sign up in under a minute—no credit card required. I'll take you there.",
    request_demo: "I'd be happy to arrange a demo. You can sign up and we'll get in touch, or leave your email and we'll contact you.",
    contact_support: "Our team is here to help. You can reach us via the contact link in the footer, or sign up and use in-app support.",
    see_features: "We offer WhatsApp automation, lead qualification, orders & sales, and 24/7 support. I can tell you more or you can explore the solutions section below.",
    lead_thanks: "Thanks! We'll be in touch soon.",
  },
  fr: {
    welcome: "Bonjour ! 👋 Je suis là pour vous aider à découvrir SEVEN T. Nous automatisons les conversations WhatsApp avec l'IA pour répondre à vos clients 24h/24. Que souhaitez-vous faire ?",
    fallback: "Je n'ai pas bien compris. Vous pouvez créer un compte gratuit, demander une démo ou en savoir plus sur nos fonctionnalités. Que choisissez-vous ?",
    create_account: "Bon choix ! Vous pouvez vous inscrire en moins d'une minute, sans carte bancaire. Je vous y emmène.",
    request_demo: "Avec plaisir pour une démo. Inscrivez-vous et nous vous recontacterons, ou laissez votre email.",
    contact_support: "Notre équipe est là pour vous. Contactez-nous via le lien en bas de page ou inscrivez-vous pour le support in-app.",
    see_features: "Nous proposons l'automatisation WhatsApp, la qualification de leads, les commandes et ventes, et le support 24h/24. Je peux détailler ou vous pouvez parcourir la section Solutions ci-dessous.",
    lead_thanks: "Merci ! Nous vous recontacterons bientôt.",
  },
};

function getT(lang) {
  const l = (lang || 'en').toLowerCase().split('-')[0];
  return defaultReplies[l] || defaultReplies.en;
}

function ensureSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    const id = sessionId || uuidv4();
    sessions.set(id, {
      messages: [],
      step: 'welcome',
      email: null,
      phone: null,
      createdAt: Date.now(),
    });
    return id;
  }
  return sessionId;
}

// Periodic cleanup of old sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of sessions.entries()) {
    if (now - data.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60 * 60 * 1000);

/**
 * POST /api/landing-chat
 * Body: { sessionId?, message?, language?, action?, contact? }
 * - action: 'create_account' | 'request_demo' | 'contact_support' | 'see_features'
 * - contact: { email?, phone? } for lead capture
 */
router.post('/', async (req, res) => {
  try {
    const { sessionId: rawId, message, language = 'en', action, contact } = req.body || {};
    const sessionId = ensureSession(rawId);
    const session = sessions.get(sessionId);
    const t = getT(language);

    // Lead capture
    if (contact && (contact.email || contact.phone)) {
      const email = (contact.email || '').trim() || null;
      const phone = (contact.phone || '').trim() || null;
      if (email || phone) {
        session.email = session.email || email;
        session.phone = session.phone || phone;
        try {
          const leadId = uuidv4();
          await db.run(
            `INSERT INTO landing_chat_leads (id, session_id, email, phone, language, message_count, source)
             VALUES (?, ?, ?, ?, ?, ?, 'landing_chat')`,
            leadId,
            sessionId,
            session.email,
            session.phone,
            (language || 'en').slice(0, 10),
            session.messages.length,
          );
        } catch (e) {
          console.error('[landing-chat] Save lead error:', e?.message);
        }
        return res.json({
          sessionId,
          reply: t.lead_thanks,
          quickReplies: [
            { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
            { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
          ],
          leadCaptured: true,
        });
      }
    }

    // Quick actions (no user message)
    if (action) {
      let reply = '';
      let quickReplies = [];
      switch (action) {
        case 'create_account':
          reply = t.create_account;
          quickReplies = [{ id: 'goto_register', label: language?.startsWith('fr') ? 'Aller à l\'inscription' : 'Go to sign up' }];
          break;
        case 'request_demo':
          reply = t.request_demo;
          quickReplies = [
            { id: 'goto_register', label: language?.startsWith('fr') ? 'S\'inscrire' : 'Sign up' },
            { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
          ];
          break;
        case 'contact_support':
          reply = t.contact_support;
          quickReplies = [
            { id: 'goto_register', label: language?.startsWith('fr') ? 'S\'inscrire' : 'Sign up' },
            { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
          ];
          break;
        case 'see_features':
          reply = t.see_features;
          quickReplies = [
            { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
            { id: 'request_demo', label: language?.startsWith('fr') ? 'Demander une démo' : 'Request a demo' },
          ];
          break;
        default:
          reply = t.fallback;
          quickReplies = [
            { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
            { id: 'request_demo', label: language?.startsWith('fr') ? 'Demander une démo' : 'Request a demo' },
            { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
          ];
      }
      session.messages.push({ role: 'user', content: action });
      session.messages.push({ role: 'assistant', content: reply });
      return res.json({ sessionId, reply, quickReplies });
    }

    // First message (welcome) – no user message yet
    if (!message && session.messages.length === 0) {
      session.messages.push({ role: 'assistant', content: t.welcome });
      const quickReplies = [
        { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
        { id: 'request_demo', label: language?.startsWith('fr') ? 'Demander une démo' : 'Request a demo' },
        { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
        { id: 'contact_support', label: language?.startsWith('fr') ? 'Contacter le support' : 'Contact support' },
      ];
      return res.json({ sessionId, reply: t.welcome, quickReplies });
    }

    // Free-text user message
    const userText = (message || '').trim();
    if (!userText) {
      return res.json({
        sessionId,
        reply: t.fallback,
        quickReplies: [
          { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
          { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
        ],
      });
    }

    session.messages.push({ role: 'user', content: userText });

    let reply = t.fallback;
    if (openaiClient) {
      try {
        const sys = language?.startsWith('fr')
          ? 'Tu es l\'assistant de la page d\'accueil de SEVEN T (automatisation WhatsApp avec IA). Réponds en français, en 1-2 phrases courtes. Oriente vers l\'inscription gratuite, la démo ou les fonctionnalités. Sois professionnel et rassurant.'
          : 'You are the assistant for SEVEN T\'s landing page (WhatsApp automation with AI). Reply in English, in 1-2 short sentences. Guide users to free sign-up, demo, or features. Be professional and reassuring.';
        const history = session.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: sys }, ...history],
          temperature: 0.5,
          max_tokens: 150,
        });
        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) reply = raw;
      } catch (err) {
        console.warn('[landing-chat] LLM error:', err?.message);
      }
    }

    session.messages.push({ role: 'assistant', content: reply });
    const quickReplies = [
      { id: 'create_account', label: language?.startsWith('fr') ? 'Créer un compte' : 'Create account' },
      { id: 'request_demo', label: language?.startsWith('fr') ? 'Demander une démo' : 'Request a demo' },
      { id: 'see_features', label: language?.startsWith('fr') ? 'Voir les fonctionnalités' : 'See features' },
    ];
    return res.json({ sessionId, reply, quickReplies });
  } catch (err) {
    console.error('[landing-chat] Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * GET /api/landing-chat/welcome
 * Returns welcome message and quick replies for initial load (client can show after delay).
 */
router.get('/welcome', (req, res) => {
  const language = (req.query.language || 'en').toLowerCase().split('-')[0];
  const t = getT(language);
  const quickReplies = [
    { id: 'create_account', label: language === 'fr' ? 'Créer un compte' : 'Create account' },
    { id: 'request_demo', label: language === 'fr' ? 'Demander une démo' : 'Request a demo' },
    { id: 'see_features', label: language === 'fr' ? 'Voir les fonctionnalités' : 'See features' },
    { id: 'contact_support', label: language === 'fr' ? 'Contacter le support' : 'Contact support' },
  ];
  res.json({ reply: t.welcome, quickReplies });
});

export default router;
