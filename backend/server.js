// Load environment variables FIRST (before any other imports)
import 'dotenv/config';

import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
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
import partnerAuthRoutes from './routes/partnerAuth.js';
import agentRoutes from './routes/agents.js';
import toolsRoutes from './routes/tools.js';
import whatsappRoutes from './routes/whatsapp.js';
import outlookRoutes from './routes/outlook.js';
import googleCalendarRoutes from './routes/googleCalendar.js';
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
import influencerRoutes from './routes/influencer.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes, { handleGeniusPaySubscriptionWebhook } from './routes/subscription.js';
import landingChatRoutes from './routes/landingChat.js';
import chatbotRoutes from './routes/chatbot.js';
import settingsRoutes from './routes/settings.js';
import pollRoutes from './routes/polls.js';
import serviceRoutes from './routes/services.js';
import ticketsRoutes from './routes/tickets.js';
import adminTicketsRoutes from './routes/adminTickets.js';
import dealRoutes from './routes/deals.js';

// Database
import db, { initDatabase } from './database/init.js';

// WhatsApp Manager
import { whatsappManager } from './services/whatsapp.js';
import { setIO } from './services/socketEmitter.js';
import { runDailyBriefingJob } from './services/dailyBriefing.js';
import { runNextBestActionJob } from './services/nextBestAction.js';
import { runCampaignSchedulerJob } from './services/campaigns.js';
import { runStatusSchedulerJob } from './services/whatsapp.js';
import { startWorkflowWorker } from './workers/workflowWorker.js';
import { proactiveAdvisorService } from './services/proactiveAdvisor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
if (isProduction) {
    const required = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL'];
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
        // In development, allow all origins
        if (!isProduction) {
            return callback(null, true);
        }

        // Allow requests with no origin (direct navigation, health checks, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Normalize origin for comparison
        const normalizedOrigin = origin.replace(/\/$/, '');

        // Check against allowed origins list
        const isExplicitlyAllowed = allowedOrigins.some(ao => ao.replace(/\/$/, '') === normalizedOrigin);
        
        if (isExplicitlyAllowed) {
            return callback(null, true);
        }

        // Auto-allow local development domains and any subdomain of .local
        try {
            const originUrl = new URL(origin);
            if (originUrl.hostname === 'localhost' || 
                originUrl.hostname === '127.0.0.1' || 
                originUrl.hostname.endsWith('.local')) {
                return callback(null, true);
            }
        } catch (e) {
            // If origin is not a valid URL (rare with real browsers)
        }

        console.warn(`🛑 CORS blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Cookie parsing (for OAuth state)
app.use(cookieParser());



// GeniusPay subscription webhook
app.post('/api/subscription/webhook/geniuspay', express.raw({ type: 'application/json' }), handleGeniusPaySubscriptionWebhook);

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all inputs
app.use(sanitizeInput);

// Global rate limiting
app.use('/api', apiLimiter);



// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/partner/auth', authLimiter, partnerAuthRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/whatsapp', whatsappLimiter, whatsappRoutes);
app.use('/api/outlook', outlookRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
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
app.use('/api/services', serviceRoutes);
app.use('/api/influencer', influencerRoutes);

app.get('/api/health-db', async (req, res) => {
    try {
        const result = await db.all('SELECT 1 as connected');
        res.json({ status: 'ok', db: result });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.get('/api/debug-schema', async (req, res) => {
    try {
        const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_links'");
        const usersCols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        res.json({ 
            payment_links: cols.map(c => c.column_name),
            users: usersCols.map(c => c.column_name)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.use('/api/tags', tagRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/admin', adminTicketsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/landing-chat', landingChatRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/deals', dealRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
if (isProduction) {
    // Robust path for Docker environments
    const distPath = process.env.FRONTEND_DIST_PATH || join(__dirname, '..', 'frontend', 'dist');
    
    if (existsSync(distPath)) {
        app.use(express.static(distPath));
        
        // Support React Router (SPA) by serving index.html for unknown routes
        // Only fallback to index.html for requests that don't look like files (no dot in the last segment)
        
        // Debug Route
        app.get('/api/debug-plan', async (req, res) => {
            try {
                const users = await db.all("SELECT id, name, email, plan, subscription_end_date FROM users");
                const plans = await db.all("SELECT name, limits FROM subscription_plans");
                res.json({ users, plans });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.get('*', (req, res, next) => {
            // If the request has an extension or starts with /api, pass it through (it's a 404 for a file or an API call)
            if (req.url.startsWith('/api') || req.url.includes('.')) {
                return next();
            }
            res.sendFile(join(distPath, 'index.html'));
        });
        console.log(`✅ Serving frontend from: ${distPath}`);
    } else {
        console.warn(`⚠️ Frontend dist directory not found at: ${distPath}`);
    }
}

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
            SELECT id, name, display_name, description, price, price_currency, limits, features, sort_order, price_yearly
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
            priceYearly: plan.price_yearly || null
        }));

        return res.json({ plans: parsedPlans });
    } catch (error) {
        console.error('Get public plans error:', error?.message || error);
        if (!res.headersSent) {
            return res.status(200).json({ plans: [] });
        }
    }
});

// ── SOCKET.IO (Real-time updates) ───────────────────────────
const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
    path: '/socket.io'
});
io.use(async (socket, next) => {
    try {
        const cookieStr = socket.handshake.headers.cookie;
        if (!cookieStr) return next(new Error('Auth cookie manquant'));
        
        // Simple cookie parser for socket handshake
        const cookies = Object.fromEntries(cookieStr.split(';').map(c => c.trim().split('=')));
        const token = cookies.access_token || socket.handshake.auth?.token || socket.handshake.query?.token;
        
        if (!token) return next(new Error('Token requis'));
        
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error('Token invalide'));
            socket.userId = String(decoded.id);
            next();
        });
    } catch (e) {
        next(new Error('Erreur auth socket'));
    }
});
io.on('connection', (socket) => {
    socket.join(socket.userId);
    socket.on('disconnect', () => {});
});
setIO(io);

// Start server
async function start() {
    try {
        // Initialize database
        await initDatabase();
        try {
            await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_tickets INTEGER DEFAULT 0');
        } catch (e) {
            // ignore if exists
        }
        console.log('✅ Database initialized');

        // Start Workflow Worker (BullMQ)
        startWorkflowWorker();

        // Start server (use server from http.createServer for Socket.IO)
        server.listen(PORT, async () => {
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
            }, 3000);

            // Daily briefing + next-best-action scheduler (every hour)
            setInterval(() => {
                runDailyBriefingJob().catch(err => console.error('[DailyBriefing] Job error:', err?.message));
                runNextBestActionJob().catch(err => console.error('[NextBestAction] Job error:', err?.message));
                runCampaignSchedulerJob().catch(err => console.error('[CampaignScheduler] Job error:', err?.message));
                runStatusSchedulerJob().catch(err => console.error('[StatusScheduler] Job error:', err?.message));
            }, 60 * 60 * 1000);
            
            // Frequent check for scheduled campaigns (every 5 minutes)
            setInterval(() => {
                runCampaignSchedulerJob().catch(err => console.error('[CampaignScheduler] Job error:', err?.message));
                runStatusSchedulerJob().catch(err => console.error('[StatusScheduler] Job error:', err?.message));
            }, 5 * 60 * 1000);

            // Run once shortly after startup
            setTimeout(() => {
                runDailyBriefingJob().catch(err => console.error('[DailyBriefing] Job error:', err?.message));
                runNextBestActionJob().catch(err => console.error('[NextBestAction] Job error:', err?.message));
                runCampaignSchedulerJob().catch(err => console.error('[CampaignScheduler] Job error:', err?.message));
                runStatusSchedulerJob().catch(err => console.error('[StatusScheduler] Job error:', err?.message));
                
                // Humanization: Proactive Advisor
                proactiveAdvisorService.start();
            }, 30 * 1000);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export { app, whatsappManager };
