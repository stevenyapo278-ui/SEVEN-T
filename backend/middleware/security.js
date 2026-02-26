import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { agentDefaults } from '../config/agentDefaults.js';

/**
 * Security Middleware for SEVEN T SaaS
 */

// ==================== RATE LIMITING ====================

const isProduction = process.env.NODE_ENV === 'production';

// General API rate limit - more permissive in development
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 500 : 5000, // Much higher in dev
    message: {
        error: 'Trop de requêtes, veuillez réessayer dans 15 minutes',
        retry_after: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true, // Don't count failed requests
});

// Strict rate limit for auth routes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 20 : 100, // More permissive
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
        retry_after: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false, // Count failed logins for security
});

// Rate limit for WhatsApp operations - higher limits for polling
export const whatsappLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isProduction ? 120 : 1000, // Much higher for QR code polling
    message: {
        error: 'Trop de requêtes WhatsApp, veuillez patienter',
        retry_after: 60
    },
    skipFailedRequests: true,
});

// Rate limit for AI generation
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isProduction ? 30 : 200, // AI calls
    message: {
        error: 'Limite de génération IA atteinte, veuillez patienter',
        retry_after: 60
    },
});

// ==================== HELMET SECURITY ====================

export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.openai.com", "https://generativelanguage.googleapis.com"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for QR codes
});

// ==================== INPUT VALIDATION SCHEMAS ====================

// Auth schemas
export const registerSchema = z.object({
    email: z.string()
        .email('Email invalide')
        .max(255, 'Email trop long'),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .max(100, 'Mot de passe trop long')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    name: z.string()
        .min(2, 'Le nom doit contenir au moins 2 caractères')
        .max(100, 'Nom trop long')
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nom invalide'),
    company: z.string()
        .max(200, 'Nom d\'entreprise trop long')
        .optional()
        .nullable(),
});

export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
});

// Agent schemas
export const createAgentSchema = z.object({
    name: z.string()
        .min(2, 'Le nom doit contenir au moins 2 caractères')
        .max(100, 'Nom trop long'),
    description: z.string()
        .max(500, 'Description trop longue')
        .optional()
        .nullable(),
    system_prompt: z.string()
        .max(5000, 'Prompt trop long')
        .optional()
        .nullable(),
    model: z.enum(['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'])
        .optional()
        .default(agentDefaults.model),
    temperature: z.number()
        .min(0)
        .max(2)
        .optional()
        .default(agentDefaults.temperature),
    max_tokens: z.number()
        .min(50)
        .max(4000)
        .optional()
        .default(agentDefaults.max_tokens),
    language: z.enum(['fr', 'en', 'es', 'de', 'it', 'pt', 'ar'])
        .optional()
        .default('fr'),
    template: z.enum(['default', 'ecommerce', 'commercial', 'support', 'faq', 'appointment', 'info', 'custom']).nullable()
        .optional(),
});

export const updateAgentSchema = createAgentSchema.partial().extend({
    is_active: z.number().min(0).max(1).optional(),
    auto_reply: z.number().min(0).max(1).optional(),
    response_delay: z.number().min(0).max(300).optional(),
    availability_enabled: z.number().min(0).max(1).optional(),
    availability_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    availability_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    availability_days: z.string().optional(),
    availability_timezone: z.string().optional(),
    absence_message: z.string().max(500).optional(),
    human_transfer_enabled: z.number().min(0).max(1).optional(),
    human_transfer_keywords: z.string().max(500).optional(),
    human_transfer_message: z.string().max(500).optional(),
    max_messages_per_day: z.number().min(0).max(10000).optional(),
});

// Knowledge base schema
export const knowledgeSchema = z.object({
    title: z.string()
        .min(2, 'Titre trop court')
        .max(200, 'Titre trop long'),
    content: z.string()
        .min(10, 'Contenu trop court')
        .max(50000, 'Contenu trop long'),
    type: z.enum(['text', 'faq', 'document'])
        .optional()
        .default('text'),
});

// Template schema
export const templateSchema = z.object({
    name: z.string()
        .min(2, 'Nom trop court')
        .max(100, 'Nom trop long'),
    content: z.string()
        .min(1, 'Contenu requis')
        .max(2000, 'Contenu trop long'),
    shortcut: z.string()
        .max(20, 'Raccourci trop long')
        .optional()
        .nullable(),
    category: z.string()
        .max(50, 'Catégorie trop longue')
        .optional()
        .default('general'),
});

// Conversations schemas
export const updateConversationStatusSchema = z.object({
    status: z.string().min(1, 'Statut requis').max(50, 'Statut trop long')
});

export const updateConversationContactSchema = z.object({
    contact_name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long')
});

export const bulkTakeoverSchema = z.object({
    conversation_ids: z.array(z.string().min(1)).min(1, 'Liste de conversations requise'),
    human_takeover: z.boolean()
});

export const toggleTakeoverSchema = z.object({
    human_takeover: z.boolean()
});

export const deleteMessagesSchema = z.object({
    message_ids: z.array(z.string().min(1)).optional(),
    delete_all: z.boolean().optional()
}).refine((data) => data.delete_all === true || (Array.isArray(data.message_ids) && data.message_ids.length > 0), {
    message: 'Indiquez message_ids (tableau) ou delete_all: true'
});

// Tools schema
export const createToolSchema = z.object({
    type: z.enum(['whatsapp', 'outlook']),
    label: z.string().max(100, 'Label trop long').optional().nullable()
});

// Blacklist schema
export const blacklistSchema = z.object({
    contact_jid: z.string().min(1, 'Contact JID requis'),
    contact_name: z.string().max(100).optional().nullable(),
    reason: z.string().max(500).optional().nullable(),
});

// Payment link creation (POST /payments)
export const createPaymentLinkSchema = z.object({
    amount: z.number().positive('Montant invalide').or(z.coerce.number().positive('Montant invalide')),
    currency: z.string().max(10, 'Devise trop longue').optional().default('XOF'),
    description: z.string().max(500, 'Description trop longue').optional().nullable(),
    provider: z.enum(['manual', 'paymetrust']).optional().default('manual'),
    order_id: z.string().max(64).optional().nullable(),
    conversation_id: z.string().max(64).optional().nullable(),
    expires_in_hours: z.number().min(1).max(720).optional().default(24),
});

// Order payment link (POST /orders/:id/payment-link)
export const orderPaymentLinkSchema = z.object({
    provider: z.enum(['manual', 'paymetrust']).optional().default('manual'),
});

// Product create (POST /products)
export const productCreateSchema = z.object({
    name: z.string().min(1, 'Le nom est requis').max(500, 'Nom trop long'),
    sku: z.string().max(100, 'SKU trop long').optional().nullable(),
    price: z.coerce.number().min(0, 'Le prix doit être positif').optional().default(0),
    cost_price: z.coerce.number().min(0, 'Le prix d\'achat doit être positif').optional().default(0),
    stock: z.coerce.number().int().min(0, 'Le stock doit être un entier positif').optional().default(0),
    category: z.string().max(200, 'Catégorie trop longue').optional().nullable(),
    description: z.string().max(10000, 'Description trop longue').optional().nullable(),
    image_url: z.string().max(2000, 'URL image trop longue').optional().nullable(),
});

// Product update (PUT /products/:id) – partial
export const productUpdateSchema = z.object({
    name: z.string().min(1).max(500).optional(),
    sku: z.string().max(100).optional().nullable(),
    price: z.coerce.number().min(0).optional(),
    cost_price: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    category: z.string().max(200).optional().nullable(),
    description: z.string().max(10000).optional().nullable(),
    image_url: z.string().max(2000).optional().nullable(),
    is_active: z.number().min(0).max(1).optional(),
});

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Create a validation middleware from a Zod schema
 */
export function validate(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            
            if (!result.success) {
                const errors = result.error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }));
                
                return res.status(400).json({
                    error: 'Données invalides',
                    details: errors
                });
            }
            
            // Replace body with validated data (includes defaults)
            req.body = result.data;
            next();
        } catch (error) {
            console.error('Validation error:', error);
            res.status(500).json({ error: 'Erreur de validation' });
        }
    };
}

/**
 * Sanitize string to prevent XSS (only escape characters that can break HTML/script context).
 * Do not escape quotes/apostrophes so stored values (e.g. company "RANS'O AFRO") display correctly
 * when rendered as text in React; React escapes output when rendering.
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Middleware to sanitize all string inputs
 */
export function sanitizeInput(req, res, next) {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitize(value);
            }
            return sanitized;
        }
        return obj;
    };
    
    if (req.body) {
        req.body = sanitize(req.body);
    }
    
    next();
}

export default {
    apiLimiter,
    authLimiter,
    whatsappLimiter,
    aiLimiter,
    helmetConfig,
    validate,
    sanitizeInput,
    registerSchema,
    loginSchema,
    createAgentSchema,
    updateAgentSchema,
    knowledgeSchema,
    templateSchema,
    blacklistSchema,
    updateConversationStatusSchema,
    updateConversationContactSchema,
    bulkTakeoverSchema,
    toggleTakeoverSchema,
    deleteMessagesSchema,
    createToolSchema,
    createPaymentLinkSchema,
    orderPaymentLinkSchema,
    productCreateSchema,
    productUpdateSchema,
};
