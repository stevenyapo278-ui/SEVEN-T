// Load environment variables FIRST (before any other imports)
import 'dotenv/config';

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Security middleware
import { 
    apiLimiter, 
    authLimiter, 
    whatsappLimiter,
    helmetConfig,
    sanitizeInput 
} from './middleware/security.js';
import { authenticateToken, JWT_SECRET } from './middleware/auth.js';
import jwt from 'jsonwebtoken';

// Routes
import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import toolsRoutes from './routes/tools.js';
import whatsappRoutes from './routes/whatsapp.js';
import outlookRoutes from './routes/outlook.js';
import conversationRoutes from './routes/conversations.js';
import knowledgeRoutes from './routes/knowledge.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';
import adminAIRoutes from './routes/adminAI.js';
import adminPlansRoutes from './routes/adminPlans.js';
import paymentRoutes from './routes/payments.js';
import productRoutes from './routes/products.js';
import leadRoutes from './routes/leads.js';
import notificationRoutes from './routes/notifications.js';
import orderRoutes from './routes/orders.js';
import expenseRoutes from './routes/expenses.js';
import tagRoutes from './routes/tags.js';
import templateRoutes from './routes/templates.js';
import campaignRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import workflowRoutes from './routes/workflows.js';
import flowRoutes from './routes/flows.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes, { handleStripeWebhook } from './routes/subscription.js';
import landingChatRoutes from './routes/landingChat.js';

// Database
import db, { initDatabase } from './database/init.js';

// WhatsApp Manager
import { whatsappManager } from './services/whatsapp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
if (isProduction) {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

// Create data directory
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

// Security middleware
if (isProduction) {
    app.use(helmetConfig);
    app.set('trust proxy', 1); // Trust first proxy
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cookie parsing (for OAuth state)
app.use(cookieParser());

// Stripe subscription webhook needs raw body (before json parser)
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }), (req, res) => handleStripeWebhook(req, res));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all inputs
app.use(sanitizeInput);

// Global rate limiting
app.use('/api', apiLimiter);

// Stripe webhook needs raw body (must be before json parser for this route)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/whatsapp', whatsappLimiter, whatsappRoutes);
app.use('/api/outlook', outlookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/ai', adminAIRoutes);
app.use('/api/admin', adminPlansRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/landing-chat', landingChatRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public route to get active subscription plans (for pricing page, settings, etc.)
function safeJsonParse(str, fallback = {}) {
    if (str == null || str === '') return fallback;
    try {
        const v = JSON.parse(str);
        return typeof v === 'object' && v !== null ? v : fallback;
    } catch {
        return fallback;
    }
}

app.get('/api/plans', async (req, res) => {
    try {
        const plans = await db.all(`
            SELECT id, name, display_name, description, price, price_currency, limits, features, sort_order, stripe_price_id
            FROM subscription_plans
            WHERE is_active = 1
            ORDER BY sort_order ASC
        `);

        const parsedPlans = (plans || []).map(plan => ({
            id: plan.name,
            name: plan.display_name,
            description: plan.description,
            price: plan.price,
            priceCurrency: plan.price_currency || 'FCFA',
            limits: safeJsonParse(plan.limits, {}),
            features: safeJsonParse(plan.features, {}),
            stripePriceId: plan.stripe_price_id || null
        }));

        return res.json({ plans: parsedPlans });
    } catch (error) {
        console.error('Get public plans error:', error?.message || error);
        if (!res.headersSent) {
            return res.status(200).json({ plans: [] });
        }
    }
});

// User routes (alias for /auth/me) - Optional auth for currency context (never return 500)
app.get('/api/users/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.json({ user: null });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded?.id;
        if (!userId) {
            return res.json({ user: null });
        }
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, created_at, payment_module_enabled FROM users WHERE id = ?', userId);
        return res.json({ user: user || null });
    } catch (err) {
        console.error('GET /api/users/me error:', err?.message || err);
        if (!res.headersSent) {
            return res.status(200).json({ user: null });
        }
    }
});

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const { name, company, currency } = req.body;
        const updates = [];
        const values = [];
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (company !== undefined) { updates.push('company = ?'); values.push(company); }
        if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
        
        if (updates.length > 0) {
            values.push(req.user.id);
            await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...values);
        }
        
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, created_at FROM users WHERE id = ?', req.user.id);
        res.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason?.message || reason);
    // Don't exit - keep server running
});

// Start server
async function start() {
    try {
        // Initialize database
        await initDatabase();
        console.log('✅ Database initialized');

        // Start server
        app.listen(PORT, async () => {
            console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🚀 SEVEN T - Backend Server             ║
║                                           ║
║   Server: http://localhost:${PORT}          ║
║   Status: Running                         ║
║                                           ║
╚═══════════════════════════════════════════╝
            `);

            // Reconnect WhatsApp agents that were previously connected
            // Do this after server is listening to not block startup
            setTimeout(async () => {
                try {
                    console.log('🔄 Reconnecting WhatsApp agents...');
                    const result = await whatsappManager.reconnectAllAgents();
                    if (result.reconnected > 0) {
                        console.log(`✅ ${result.reconnected} agent(s) WhatsApp reconnecté(s)`);
                    }
                    if (result.failed > 0) {
                        console.log(`⚠️  ${result.failed} agent(s) n'ont pas pu être reconnectés`);
                    }
                } catch (error) {
                    console.error('❌ Error reconnecting WhatsApp agents:', error);
                }
            }, 3000); // Wait 3 seconds after server start
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export { app, whatsappManager };
