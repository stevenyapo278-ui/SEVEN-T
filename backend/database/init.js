import { Pool } from 'pg';
import { defaultPlans } from '../config/defaultPlans.js';

/**
 * PostgreSQL connection pool.
 * Initialized in initDatabase().
 */
let pool = null;

/**
 * Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2, ...).
 */
function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}

/**
 * Normalize SQL types and keywords that were originally written for SQLite.
 * - DATETIME -> TIMESTAMP
 */
function normalizeSql(sql) {
    return sql.replace(/\bDATETIME\b/gi, 'TIMESTAMP');
}

async function query(text, params = []) {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    const normalized = normalizeSql(convertPlaceholders(text));
    return pool.query(normalized, params);
}

/**
 * Lightweight wrapper mimicking the subset of better-sqlite3 API used in the project,
 * but backed by PostgreSQL and returning Promises.
 */
export const db = {
    async exec(sql) {
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(Boolean);

        for (const stmt of statements) {
            await query(stmt);
        }
    },

    prepare(sql) {
        return {
            run: async (...params) => {
                const res = await query(sql, params);
                return { rowCount: res.rowCount };
            },
            get: async (...params) => {
                const res = await query(sql, params);
                return res.rows[0] || null;
            },
            all: async (...params) => {
                const res = await query(sql, params);
                return res.rows;
            }
        };
    },

    async get(sql, ...params) {
        const res = await query(sql, params);
        return res.rows[0] || null;
    },

    async all(sql, ...params) {
        const res = await query(sql, params);
        return res.rows;
    },

    async run(sql, ...params) {
        const res = await query(sql, params);
        return { rowCount: res.rowCount };
    },

    /**
     * Simple transaction helper. The callback receives a client-like object
     * with the same prepare/get/all/run helpers, but bound to a single connection.
     */
    async transaction(callback) {
        if (!pool) {
            throw new Error('Database not initialized. Call initDatabase() first.');
        }

        const client = await pool.connect();
        const clientQuery = async (text, params = []) => {
            const normalized = normalizeSql(convertPlaceholders(text));
            return client.query(normalized, params);
        };

        const txDb = {
            prepare(sql) {
                return {
                    run: async (...params) => {
                        const res = await clientQuery(sql, params);
                        return { rowCount: res.rowCount };
                    },
                    get: async (...params) => {
                        const res = await clientQuery(sql, params);
                        return res.rows[0] || null;
                    },
                    all: async (...params) => {
                        const res = await clientQuery(sql, params);
                        return res.rows;
                    }
                };
            },
            async get(sql, ...params) {
                const res = await clientQuery(sql, params);
                return res.rows[0] || null;
            },
            async all(sql, ...params) {
                const res = await clientQuery(sql, params);
                return res.rows;
            },
            async run(sql, ...params) {
                const res = await clientQuery(sql, params);
                return { rowCount: res.rowCount };
            }
        };

        try {
            await client.query('BEGIN');
            const result = await callback(txDb);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

export async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required to connect to PostgreSQL');
    }

    pool = new Pool({
        connectionString,
        // Production pool settings for multi-tenant SaaS concurrency
        max: parseInt(process.env.DB_POOL_MAX || '20'),        // Max simultaneous connections
        idleTimeoutMillis: 30000,                              // Release idle connections after 30s
        connectionTimeoutMillis: 5000,                         // Fail fast if no connection available
        allowExitOnIdle: false                                 // Keep pool alive (server process)
    });

    // Basic connectivity check
    try {
        await pool.query('SELECT 1');
    } catch (err) {
        if (err.code === '28000' || (err.message && /ident|authentication|auth/i.test(err.message))) {
            console.error('\n❌ PostgreSQL a refusé la connexion (authentification).');
            console.error('   Pour autoriser l’accès avec mot de passe, exécutez :');
            console.error('   1) Définir le mot de passe utilisateur postgres :');
            console.error('      sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'postgres\';"');
            console.error('   2) Modifier pg_hba.conf (souvent dans /var/lib/pgsql/data/ ou /etc/postgresql/) :');
            console.error('      Remplacer "ident" par "md5" ou "scram-sha-256" pour les lignes host 127.0.0.1');
            console.error('   3) Recharger PostgreSQL : sudo systemctl reload postgresql');
            console.error('   Ou utilisez Docker : docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=seven_t -p 5432:5432 postgres:16\n');
        }
        throw err;
    }

    // Core tables and indexes (simplified: assumes a fresh PostgreSQL database)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            company TEXT,
            plan TEXT DEFAULT 'starter',
            credits INTEGER DEFAULT 1500,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            -- Granular permissions for partial admins
            can_manage_users INTEGER DEFAULT 0,
            can_manage_plans INTEGER DEFAULT 0,
            can_view_stats INTEGER DEFAULT 0,
            can_manage_ai INTEGER DEFAULT 0,
            can_manage_tickets INTEGER DEFAULT 0,
            subscription_status TEXT DEFAULT 'trialing',
            subscription_end_date TIMESTAMP,
            currency TEXT DEFAULT 'XOF',
            media_model TEXT,
            google_id TEXT,
            notification_number TEXT,
            reset_token TEXT,
            reset_token_expires TIMESTAMP,
            payment_module_enabled INTEGER,
            analytics_module_enabled INTEGER,
            reports_module_enabled INTEGER,
            availability_hours_enabled INTEGER,
            next_best_action_enabled INTEGER,
            conversion_score_enabled INTEGER,
            daily_briefing_enabled INTEGER,
            sentiment_routing_enabled INTEGER,
            catalog_import_enabled INTEGER,
            human_handoff_alerts_enabled INTEGER,
            flows_module_enabled INTEGER,
            whatsapp_status_enabled INTEGER,
            leads_management_enabled INTEGER,
            -- Multi-user / Manager support
            parent_user_id TEXT,
            role TEXT DEFAULT 'owner', -- 'owner', 'manager'
            permissions TEXT, -- JSON array of specific permissions

            proactive_advisor_enabled INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Activity Logs Table (Audit Trail)
        CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,         -- login, create_user, update_agent, etc.
            entity_type TEXT,            -- user, agent, plan, etc.
            entity_id TEXT,
            details TEXT,                -- JSON description of the action
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
    `);

    // Add columns if they don't exist (for existing databases)
        const columnsToUpdate = [
            { name: 'reset_token', type: 'TEXT' },
            { name: 'reset_token_expires', type: 'TIMESTAMP' },
            { name: 'payment_module_enabled', type: 'INTEGER' },
            { name: 'analytics_module_enabled', type: 'INTEGER' },
            { name: 'reports_module_enabled', type: 'INTEGER' },
            { name: 'availability_hours_enabled', type: 'INTEGER' },
            { name: 'next_best_action_enabled', type: 'INTEGER' },
            { name: 'conversion_score_enabled', type: 'INTEGER' },
            { name: 'daily_briefing_enabled', type: 'INTEGER' },
            { name: 'sentiment_routing_enabled', type: 'INTEGER' },
            { name: 'catalog_import_enabled', type: 'INTEGER' },
            { name: 'human_handoff_alerts_enabled', type: 'INTEGER' },
            { name: 'flows_module_enabled', type: 'INTEGER' },
            { name: 'whatsapp_status_enabled', type: 'INTEGER' },
            { name: 'leads_management_enabled', type: 'INTEGER' },
            { name: 'campaigns_module_enabled', type: 'INTEGER' },
            { name: 'proactive_advisor_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'proactive_requires_validation', type: 'INTEGER DEFAULT 1' },
            { name: 'polls_module_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'parent_user_id', type: 'TEXT' },
            { name: 'role', type: "TEXT DEFAULT 'owner'" },
            { name: 'permissions', type: 'TEXT' }
        ];

        for (const col of columnsToUpdate) {
            try {
                // PostgreSQL doesn't support "ADD COLUMN IF NOT EXISTS"
                // Check if column exists first
                const colCheck = await query(
                    "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = ?",
                    [col.name]
                );
                
                if (colCheck.rowCount === 0) {
                    console.log(`Adding missing column: users.${col.name}`);
                    await query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                }
            } catch (e) {
                console.warn(`users.${col.name} migration error:`, e?.message);
            }
        }

        await db.exec(`
        -- Set default role for existing users
        UPDATE users SET role = 'owner' WHERE role IS NULL;
        UPDATE users SET campaigns_module_enabled = 1 WHERE campaigns_module_enabled IS NULL; -- All existing users get it enabled



        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT,
            model TEXT DEFAULT 'gemini-1.5-flash',
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 500,
            language TEXT DEFAULT 'fr',
            response_delay INTEGER DEFAULT 0,
            max_messages_per_day INTEGER DEFAULT 0,
            auto_reply INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            whatsapp_connected INTEGER DEFAULT 0,
            whatsapp_number TEXT,
            availability_enabled INTEGER DEFAULT 0,
            availability_start TEXT DEFAULT '09:00',
            availability_end TEXT DEFAULT '18:00',
            availability_days TEXT DEFAULT '1,2,3,4,5',
            availability_timezone TEXT DEFAULT 'Europe/Paris',
            absence_message TEXT DEFAULT 'Merci pour votre message ! Nous sommes actuellement indisponibles. Nous vous répondrons dès que possible.',
            human_transfer_enabled INTEGER DEFAULT 0,
            human_transfer_keywords TEXT DEFAULT 'humain,agent,parler à quelqu''un,assistance',
            human_transfer_message TEXT DEFAULT 'Je vous transfère vers un conseiller. Veuillez patienter.',
            media_model TEXT,
            template TEXT,
            tool_id TEXT,
            calendar_tool_id TEXT,
            outlook_tool_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tools (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            label TEXT,
            status TEXT DEFAULT 'disconnected',
            config TEXT DEFAULT '{}',
            meta TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tools_user ON tools(user_id);
        CREATE INDEX IF NOT EXISTS idx_tools_type ON tools(type);

        CREATE TABLE IF NOT EXISTS knowledge_base (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            contact_jid TEXT NOT NULL,
            contact_name TEXT,
            contact_number TEXT,
            status TEXT DEFAULT 'active',
            last_message_at TIMESTAMP,
            last_read_at TIMESTAMP,
            unread_messages_count INTEGER DEFAULT 0,
            tags TEXT DEFAULT '[]',
            priority TEXT DEFAULT 'normal',
            is_transferred INTEGER DEFAULT 0,
            needs_human INTEGER DEFAULT 0,
            needs_human_reason TEXT,
            sentiment TEXT DEFAULT 'neutral',
            profile_picture TEXT,
            profile_picture_updated TEXT,
            human_takeover INTEGER DEFAULT 0,
            push_name TEXT,
            notify_name TEXT,
            is_business INTEGER DEFAULT 0,
            verified_biz_name TEXT,
            saved_contact_name TEXT,
            customer_context TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            whatsapp_id TEXT,
            tokens_used INTEGER DEFAULT 0,
            sender_type TEXT DEFAULT 'ai',
            media_url TEXT,
            is_status_reply INTEGER DEFAULT 0,
            quoted_content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge_base(agent_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_jid);

        CREATE TABLE IF NOT EXISTS blacklist (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            contact_jid TEXT NOT NULL,
            contact_name TEXT,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
            UNIQUE(agent_id, contact_jid)
        );

        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            shortcut TEXT,
            category TEXT DEFAULT 'general',
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS message_ai_logs (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            direction TEXT NOT NULL DEFAULT 'in',
            payload_hash TEXT,
            prompt_version TEXT,
            llm_output_summary TEXT,
            auto_qa_result TEXT,
            decision TEXT NOT NULL,
            decision_reason TEXT,
            response_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT,
            price DOUBLE PRECISION DEFAULT 0,
            stock INTEGER DEFAULT 0,
            category TEXT,
            description TEXT,
            image_url TEXT,
            is_active INTEGER DEFAULT 1,
            compare_price DOUBLE PRECISION,
            cost_price DOUBLE PRECISION,
            weight DOUBLE PRECISION,
            dimensions TEXT,
            barcode TEXT,
            low_stock_threshold INTEGER DEFAULT 5,
            has_variants INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_images (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            url TEXT NOT NULL,
            alt_text TEXT,
            is_primary INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_variants (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT,
            price DOUBLE PRECISION,
            stock INTEGER DEFAULT 0,
            attributes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price DOUBLE PRECISION DEFAULT 0,
            duration INTEGER DEFAULT 30,
            category TEXT,
            image_url TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_categories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            parent_id TEXT,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            company TEXT,
            source TEXT DEFAULT 'whatsapp',
            status TEXT DEFAULT 'new',
            tags TEXT,
            notes TEXT,
            is_favorite INTEGER DEFAULT 0,
            conversation_id TEXT,
            is_suggested INTEGER DEFAULT 0,
            ai_confidence DOUBLE PRECISION DEFAULT 0,
            ai_reason TEXT,
            agent_id TEXT,
            validated_at TIMESTAMP,
            rejected_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Éviter les doublons de leads par numéro / email pour un même user
        CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_phone_unique
            ON leads(user_id, phone)
            WHERE phone IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_email_unique
            ON leads(user_id, email)
            WHERE email IS NOT NULL;

        CREATE TABLE IF NOT EXISTS global_knowledge (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS agent_global_knowledge (
            agent_id TEXT NOT NULL,
            global_knowledge_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (agent_id, global_knowledge_id),
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
            FOREIGN KEY (global_knowledge_id) REFERENCES global_knowledge(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id TEXT PRIMARY KEY,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            agent_id TEXT,
            chunk_index INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL,
            message TEXT,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            conversation_id TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            status TEXT DEFAULT 'pending',
            total_amount DOUBLE PRECISION DEFAULT 0,
            currency TEXT DEFAULT 'XOF',
            notes TEXT,
            alert_whatsapp_id TEXT, -- WhatsApp message ID of the alert sent to notification_number
            validated_by TEXT,
            validated_at TIMESTAMP,
            rejected_at TIMESTAMP,
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            proactive_relance_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS alert_whatsapp_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_orders_alert_whatsapp_id ON orders(alert_whatsapp_id);

        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT NOT NULL,
            product_sku TEXT,
            quantity INTEGER DEFAULT 1,
            unit_price DOUBLE PRECISION DEFAULT 0,
            total_price DOUBLE PRECISION DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );

        -- Reports and Subscriptions
        CREATE TABLE IF NOT EXISTS generated_reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            report_type TEXT NOT NULL,
            title TEXT NOT NULL,
            data TEXT NOT NULL, -- JSON
            period_start TIMESTAMP,
            period_end TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS report_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            report_type TEXT NOT NULL,
            frequency TEXT DEFAULT 'weekly',
            email TEXT,
            is_active INTEGER DEFAULT 1,
            next_send_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expense_date DATE NOT NULL,
            category TEXT NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            currency TEXT DEFAULT 'XOF',
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_logs (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            quantity_change INTEGER DEFAULT 0,
            stock_before INTEGER DEFAULT 0,
            stock_after INTEGER DEFAULT 0,
            order_id TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'gray',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, name)
        );

        CREATE TABLE IF NOT EXISTS conversation_tags (
            conversation_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, tag_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversation_notes (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS message_templates (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            variables TEXT,
            usage_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            total_recipients INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            delivered_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS whatsapp_statuses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            caption TEXT,
            mime_type TEXT,
            whatsapp_message_id TEXT,
            whatsapp_message_key TEXT,
            background_color TEXT,
            font INTEGER,
            status TEXT DEFAULT 'scheduled',
            scheduled_at TIMESTAMP,
            recurrence_interval INTEGER DEFAULT 0, -- Days between updates, 0 = no recurrence
            last_sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaign_recipients (
            id TEXT PRIMARY KEY,
            campaign_id TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            contact_name TEXT,
            status TEXT DEFAULT 'pending',
            sent_at TIMESTAMP,
            error_message TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS saas_subscription_payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan_id TEXT NOT NULL,
            billing_period TEXT DEFAULT 'monthly',
            amount DOUBLE PRECISION NOT NULL,
            currency TEXT DEFAULT 'XOF',
            status TEXT DEFAULT 'pending',
            external_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payment_links (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            order_id TEXT,
            conversation_id TEXT,
            amount DOUBLE PRECISION NOT NULL,
            currency TEXT DEFAULT 'XOF',
            description TEXT,
            provider TEXT DEFAULT 'manual',
            external_id TEXT,
            payment_url_external TEXT,
            status TEXT DEFAULT 'pending',
            paid_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS payment_url_external TEXT;
        ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS external_id TEXT;

        -- Campaign recurrence columns
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none'; -- 'none', 'daily', 'weekly', 'monthly'
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recurrence_days TEXT; -- '1,3,5' for Mon, Wed, Fri
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;


        CREATE TABLE IF NOT EXISTS user_payment_providers (
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            credentials TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, provider),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            trigger_type TEXT NOT NULL,
            trigger_config TEXT,
            actions TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            execution_count INTEGER DEFAULT 0,
            last_executed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        -- Add column if it doesn't exist
        ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 0;
        ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP;

        CREATE TABLE IF NOT EXISTS workflow_logs (
            id TEXT PRIMARY KEY,
            workflow_id TEXT NOT NULL,
            conversation_id TEXT,
            status TEXT DEFAULT 'success',
            trigger_data TEXT,
            result TEXT,
            success INTEGER DEFAULT 1,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chatbot_flows (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            nodes TEXT NOT NULL DEFAULT '[]',
            edges TEXT NOT NULL DEFAULT '[]',
            is_active INTEGER DEFAULT 0,
            trigger_keywords TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS flow_logs (
            id TEXT PRIMARY KEY,
            flow_id TEXT NOT NULL,
            conversation_id TEXT,
            current_node TEXT,
            path TEXT,
            status TEXT DEFAULT 'in_progress',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS report_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            enabled INTEGER DEFAULT 0,
            frequency TEXT DEFAULT 'weekly',
            day_of_week INTEGER DEFAULT 1,
            hour INTEGER DEFAULT 9,
            include_messages INTEGER DEFAULT 1,
            include_leads INTEGER DEFAULT 1,
            include_orders INTEGER DEFAULT 1,
            include_revenue INTEGER DEFAULT 1,
            last_sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT DEFAULT 'weekly',
            period_start DATE,
            period_end DATE,
            data TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS workflow_contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            role TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS credit_usage (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            amount INTEGER NOT NULL,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS admin_anomalies (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            severity TEXT DEFAULT 'medium',
            title TEXT NOT NULL,
            message TEXT,
            user_id TEXT,
            agent_id TEXT,
            metadata TEXT,
            is_resolved INTEGER DEFAULT 0,
            resolved_by TEXT,
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Support Tickets
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'open',         -- open | in_progress | resolved | closed
            priority TEXT NOT NULL DEFAULT 'medium',     -- low | medium | high
            assigned_to TEXT,                            -- user id (support/admin), nullable
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
        CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
        CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

        CREATE TABLE IF NOT EXISTS ticket_messages (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            sender_id TEXT,
            sender_role TEXT NOT NULL DEFAULT 'user',    -- user | admin | support
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON ticket_messages(sender_id);

        CREATE INDEX IF NOT EXISTS idx_blacklist_agent ON blacklist(agent_id);
        CREATE INDEX IF NOT EXISTS idx_blacklist_contact ON blacklist(contact_jid);
        CREATE INDEX IF NOT EXISTS idx_templates_agent ON templates(agent_id);
        CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
        CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
        CREATE INDEX IF NOT EXISTS idx_global_knowledge_user ON global_knowledge(user_id);
        CREATE INDEX IF NOT EXISTS idx_agent_global_knowledge_agent ON agent_global_knowledge(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agent_global_knowledge_global ON agent_global_knowledge(global_knowledge_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_type, source_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_agent ON knowledge_chunks(agent_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
        CREATE INDEX IF NOT EXISTS idx_product_logs_product ON product_logs(product_id);
        CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
        CREATE INDEX IF NOT EXISTS idx_conv_tags_conv ON conversation_tags(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conv_notes_conv ON conversation_notes(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_templates_user ON message_templates(user_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_payment_links_user ON payment_links(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_payment_providers_user ON user_payment_providers(user_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_flows_user ON chatbot_flows(user_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_flows_agent ON chatbot_flows(agent_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_contacts_user ON workflow_contacts(user_id);
        CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON credit_usage(user_id);
        CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON credit_usage(created_at);
        CREATE INDEX IF NOT EXISTS idx_anomalies_type ON admin_anomalies(type);
        CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON admin_anomalies(is_resolved);
        CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON admin_anomalies(severity);
        CREATE INDEX IF NOT EXISTS idx_anomalies_created ON admin_anomalies(created_at);

        -- Performance indexes
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conversations_agent_last ON conversations(agent_id, last_message_at DESC);
        CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_credit_usage_user_date ON credit_usage(user_id, created_at DESC);

        -- Refresh tokens for secure JWT rotation
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

        CREATE TABLE IF NOT EXISTS report_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            report_type TEXT NOT NULL,
            frequency TEXT DEFAULT 'weekly',
            email TEXT,
            is_active INTEGER DEFAULT 1,
            last_sent_at TIMESTAMP,
            next_send_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS generated_reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            report_type TEXT NOT NULL,
            title TEXT NOT NULL,
            data TEXT,
            period_start TIMESTAMP,
            period_end TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // AI models, API keys, usage and subscription_plans (public endpoints depend on these)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ai_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            model_id TEXT NOT NULL,
            description TEXT,
            credits_per_use INTEGER DEFAULT 1,
            is_free INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            max_tokens INTEGER DEFAULT 4096,
            supports_vision INTEGER DEFAULT 0,
            supports_tools INTEGER DEFAULT 0,
            category TEXT DEFAULT 'general',
            sort_order INTEGER DEFAULT 0,
            api_key TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, model_id)
        );

        -- Ensure columns exist
        ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS api_key TEXT;

        CREATE TABLE IF NOT EXISTS ai_api_keys (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL UNIQUE,
            api_key TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            last_used_at TIMESTAMP,
            request_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_model_usage (
            id TEXT PRIMARY KEY,
            model_id TEXT NOT NULL,
            user_id TEXT,
            agent_id TEXT,
            tokens_used INTEGER DEFAULT 0,
            credits_used INTEGER DEFAULT 1,
            success INTEGER DEFAULT 1,
            error_message TEXT,
            response_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
        CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
        CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model ON ai_model_usage(model_id);
        CREATE INDEX IF NOT EXISTS idx_ai_model_usage_user ON ai_model_usage(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_model_usage_date ON ai_model_usage(created_at);

        CREATE TABLE IF NOT EXISTS platform_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            description TEXT,
            price INTEGER DEFAULT 0,
            price_currency TEXT DEFAULT 'XOF',
            billing_period TEXT DEFAULT 'monthly',
            is_active INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            limits TEXT NOT NULL,
            features TEXT NOT NULL,
            price_yearly INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active);
        CREATE INDEX IF NOT EXISTS idx_plans_order ON subscription_plans(sort_order);

        CREATE TABLE IF NOT EXISTS landing_chat_leads (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            language TEXT DEFAULT 'en',
            message_count INTEGER DEFAULT 0,
            source TEXT DEFAULT 'landing_chat',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_landing_chat_leads_session ON landing_chat_leads(session_id);
        CREATE INDEX IF NOT EXISTS idx_landing_chat_leads_created ON landing_chat_leads(created_at);
    `);

    const modelCountRow = await db.get('SELECT COUNT(*) as count FROM ai_models');
    const modelCount = Number(modelCountRow?.count ?? 0);
    if (modelCount === 0) {
        const defaultModels = [
            // Google Gemini
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', model_id: 'gemini-1.5-flash', description: 'Rapide et efficace (Recommandé)', credits: 1, category: 'fast', order: 1 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', model_id: 'gemini-1.5-pro', description: 'Intelligent et polyvalent', credits: 2, category: 'smart', order: 2 },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', model_id: 'gemini-2.0-flash', description: 'Dernier modèle, très performant', credits: 1, category: 'fast', order: 0 },
            // OpenAI
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model_id: 'gpt-4o-mini', description: 'Rapide et économique', credits: 1, category: 'fast', order: 10 },
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', model_id: 'gpt-4o', description: 'Modèle phare OpenAI', credits: 3, category: 'smart', order: 11 }
        ];

        for (const model of defaultModels) {
            await db.run(
                `
                INSERT INTO ai_models (id, name, provider, model_id, description, credits_per_use, is_free, category, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                `,
                model.id,
                model.name,
                model.provider,
                model.model_id,
                model.description,
                model.credits,
                model.is_free || 0,
                model.category,
                model.order
            );
        }
    }

    // Seed default media model setting if missing
    const mediaSetting = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'default_media_model');
    if (!mediaSetting) {
        await db.run(
            'INSERT INTO platform_settings (key, value) VALUES (?, ?)',
            'default_media_model',
            'gemini-1.5-flash'
        );
    }

    // Seed subscription plans if needed
    const planCountRow = await db.get('SELECT COUNT(*) as count FROM subscription_plans');
    const planCount = planCountRow?.count || 0;
    if (planCount === 0) {
        for (const plan of defaultPlans) {
            await db.run(
                `
                INSERT INTO subscription_plans (id, name, display_name, description, price, sort_order, is_default, limits, features)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                `,
                plan.id,
                plan.name,
                plan.display_name,
                plan.description,
                plan.price,
                plan.sort_order,
                plan.is_default || 0,
                plan.limits,
                plan.features
            );
        }
    }

    // Migration: add details column to product_logs for full change history (product + stock)
    try {
        await db.run('ALTER TABLE product_logs ADD COLUMN IF NOT EXISTS details TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('product_logs.details column migration:', e?.message);
        }
    }

    // Migration: orders - payment_method (online | on_delivery) and delivered_at for "paiement à la livraison"
    // Migration: message_templates shortcut column (for Templates page)
    try {
        await db.run('ALTER TABLE message_templates ADD COLUMN shortcut TEXT');
    } catch (e) {
        if (!/duplicate column name|already exists/i.test(e?.message || '')) {
            console.warn('message_templates.shortcut column migration:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT \'on_delivery\'');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('orders.payment_method column migration:', e?.message);
        }
    }
    try {
        await db.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('orders.delivered_at column migration:', e?.message);
        }
    }

    // Migration: users.voice_responses_enabled (per-user TTS)
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_responses_enabled INTEGER DEFAULT 0');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.voice_responses_enabled column migration:', e?.message);
        }
    }

    // Seed platform setting: voice_responses_enabled (global TTS)
    const voiceSetting = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'voice_responses_enabled');
    if (!voiceSetting) {
        await db.run('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', 'voice_responses_enabled', '0');
    }

    // Seed platform settings: security / brute force protection
    const bfEnabled = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'security_bruteforce_enabled');
    if (!bfEnabled) {
        await db.run('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', 'security_bruteforce_enabled', '0');
    }
    const bfThreshold = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'security_bruteforce_threshold');
    if (!bfThreshold) {
        await db.run('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', 'security_bruteforce_threshold', '5');
    }
    const bfWindow = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'security_bruteforce_window_minutes');
    if (!bfWindow) {
        await db.run('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', 'security_bruteforce_window_minutes', '10');
    }
    const bfBlock = await db.get('SELECT 1 FROM platform_settings WHERE key = ?', 'security_bruteforce_block_minutes');
    if (!bfBlock) {
        await db.run('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', 'security_bruteforce_block_minutes', '30');
    }

    // Migration: users.payment_module_enabled (module Moyens de paiement visible si admin l'active)
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_module_enabled INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_users INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_plans INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_stats INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_ai INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_tickets INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_module_enabled INTEGER DEFAULT 0');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT \'XOF\'');
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS media_model TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users columns migrations:', e?.message);
        }
    }

    // ── RBAC (roles & permissions) ────────────────────────────
    // Scalable SaaS permission model. Legacy flags remain for backwards compatibility.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            group_key TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_roles (
            user_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, role_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
    `);

    // Seed permissions / roles (best-effort, idempotent)
    try {
        const seedPerms = [
            ['users.read', 'users', 'Lire utilisateurs', 'Liste/lecture des utilisateurs'],
            ['users.write', 'users', 'Modifier utilisateurs', 'Créer/modifier/activer/désactiver utilisateurs'],
            ['users.credentials.reset', 'users', 'Réinitialiser mots de passe', 'Reset mot de passe utilisateur'],
            ['users.credits.write', 'users', 'Gérer crédits', 'Ajouter/retirer crédits utilisateur'],
            ['users.delete', 'users', 'Supprimer utilisateurs', 'Suppression utilisateur (soft/hard)'],

            ['billing.plans.read', 'billing', 'Lire plans', 'Voir les plans d’abonnement'],
            ['billing.plans.write', 'billing', 'Modifier plans', 'Créer/modifier/activer/désactiver plans'],
            ['billing.coupons.read', 'billing', 'Lire coupons', 'Voir coupons'],
            ['billing.coupons.write', 'billing', 'Modifier coupons', 'Créer/modifier coupons'],
            ['billing.subscriptions.write', 'billing', 'Gérer abonnements', 'Changer le plan d’un utilisateur'],

            ['ai.models.read', 'ai', 'Lire modèles IA', 'Voir modèles IA'],
            ['ai.models.write', 'ai', 'Modifier modèles IA', 'Créer/modifier/supprimer modèles IA'],
            ['ai.keys.read', 'ai', 'Lire clés IA', 'Voir clés (masquées)'],
            ['ai.keys.write', 'ai', 'Modifier clés IA', 'Configurer clés API IA'],
            ['ai.settings.write', 'ai', 'Modifier paramètres IA', 'Paramètres plateforme IA'],
            ['ai.reindex.run', 'ai', 'Lancer ré-indexation', 'Ré-indexation globale'],

            ['audit.read', 'audit', 'Lire audit logs', 'Voir journal d’activité/audit'],
            ['audit.rollback', 'audit', 'Rollback audit', 'Annuler une action (rollback)'],
            ['security.anomalies.read', 'security', 'Lire anomalies', 'Voir anomalies sécurité'],
            ['security.anomalies.manage', 'security', 'Gérer anomalies', 'Résoudre/cleanup/health-check anomalies'],

            ['platform.activity.read', 'platform', 'Lire activité plateforme', 'Flux activité / activité système'],
            ['influencer.dashboard', 'influencer', 'Accès Dashboard Influenceur', 'Suivre ses coupons et commissions']
            ,
            ['support.tickets.read', 'support', 'Lire tickets support', 'Voir tous les tickets support (admin/support)'],
            ['support.tickets.reply', 'support', 'Répondre tickets support', 'Répondre aux tickets support (admin/support)'],
            ['support.tickets.status', 'support', 'Modifier statut tickets', 'Changer le statut d’un ticket support'],
            ['support.tickets.assign', 'support', 'Assigner tickets', 'Assigner un ticket à un agent support']
        ];

        for (const [key, groupKey, name, description] of seedPerms) {
            await db.run(
                `INSERT INTO permissions (id, key, group_key, name, description)
                 VALUES (gen_random_uuid(), ?, ?, ?, ?)
                 ON CONFLICT (key) DO NOTHING`,
                key, groupKey, name, description
            );
        }

        const seedRoles = [
            ['owner', 'Owner', 'Accès total (super admin)'],
            ['support', 'Support', 'Lecture (stats/audit/anomalies), sans actions destructives'],
            ['support_agent', 'Support Agent', 'Gestion des tickets support'],
            ['user_admin', 'User Admin', 'Gestion des utilisateurs'],
            ['billing_admin', 'Billing Admin', 'Gestion plans & coupons'],
            ['ai_admin', 'AI Admin', 'Gestion IA (modèles/keys/settings/reindex)'],
            ['security_analyst', 'Security Analyst', 'Lecture audit/anomalies/stats'],
            ['influencer', 'Influencer', 'Accès au tableau de bord des coupons']
        ];

        for (const [key, name, description] of seedRoles) {
            await db.run(
                `INSERT INTO roles (id, key, name, description)
                 VALUES (gen_random_uuid(), ?, ?, ?)
                 ON CONFLICT (key) DO NOTHING`,
                key, name, description
            );
        }

        const rolePerms = {
            owner: '*',
            support: ['platform.stats.read', 'audit.read', 'security.anomalies.read', 'platform.activity.read', 'users.read'],
            support_agent: ['support.tickets.read', 'support.tickets.reply', 'support.tickets.status', 'support.tickets.assign'],
            security_analyst: ['platform.stats.read', 'audit.read', 'security.anomalies.read'],
            user_admin: ['users.read', 'users.write', 'users.credentials.reset', 'users.credits.write', 'users.delete'],
            billing_admin: ['billing.plans.read', 'billing.plans.write', 'billing.coupons.read', 'billing.coupons.write', 'billing.subscriptions.write'],
            ai_admin: ['ai.models.read', 'ai.models.write', 'ai.keys.read', 'ai.keys.write', 'ai.settings.write', 'ai.reindex.run'],
            influencer: ['influencer.dashboard']
        };

        const roles = await db.all('SELECT id, key FROM roles');
        const perms = await db.all('SELECT id, key FROM permissions');
        const roleByKey = new Map((roles || []).map(r => [r.key, r.id]));
        const permByKey = new Map((perms || []).map(p => [p.key, p.id]));

        for (const [roleKey, permKeys] of Object.entries(rolePerms)) {
            const roleId = roleByKey.get(roleKey);
            if (!roleId) continue;

            if (permKeys === '*') {
                for (const permId of permByKey.values()) {
                    await db.run(
                        `INSERT INTO role_permissions (role_id, permission_id)
                         VALUES (?, ?)
                         ON CONFLICT DO NOTHING`,
                        roleId, permId
                    );
                }
            } else {
                for (const permKey of permKeys) {
                    const permId = permByKey.get(permKey);
                    if (!permId) continue;
                    await db.run(
                        `INSERT INTO role_permissions (role_id, permission_id)
                         VALUES (?, ?)
                         ON CONFLICT DO NOTHING`,
                        roleId, permId
                    );
                }
            }
        }
    } catch (e) {
        console.warn('RBAC seed skipped:', e?.message || e);
    }



    // Migration: conversations - conversion_score, conversion_score_updated_at, suggested_action (Module 4)
    try {
        await db.run('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversion_score INTEGER');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('conversations.conversion_score column migration:', e?.message);
        }
    }
    try {
        await db.run('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversion_score_updated_at TIMESTAMP');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('conversations.conversion_score_updated_at column migration:', e?.message);
        }
    }
    try {
        await db.run('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS suggested_action TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('conversations.suggested_action column migration:', e?.message);
        }
    }

    // Migration: conversations - read tracking
    try {
        await db.run('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('conversations.last_read_at column migration:', e?.message);
        }
    }
    try {
        await db.run('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_context TEXT DEFAULT \'{}\'');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('conversations.customer_context column migration:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS proactive_relance_count INTEGER DEFAULT 0');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('orders.proactive_relance_count column migration:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS proactive_advisor_enabled INTEGER DEFAULT 0');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.proactive_advisor_enabled column migration:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS proactive_requires_validation INTEGER DEFAULT 1');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.proactive_requires_validation column migration:', e?.message);
        }
    }

    // Migration: users.notification_number (Module alertes transfert humain)
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_number TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.notification_number column migration:', e?.message);
        }
    }

    // Tables for Module 3 (next-best-action) and Module 5 (daily briefing)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS proactive_message_log (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            agent_id TEXT,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            message_content TEXT,
            reason TEXT,
            sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_proactive_message_log_conv_type ON proactive_message_log(conversation_id, type);
        CREATE INDEX IF NOT EXISTS idx_proactive_message_log_user ON proactive_message_log(user_id);

        -- Add columns if they don't exist (for existing databases)
        ALTER TABLE proactive_message_log ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
        ALTER TABLE proactive_message_log ADD COLUMN IF NOT EXISTS message_content TEXT;
        ALTER TABLE proactive_message_log ADD COLUMN IF NOT EXISTS reason TEXT;
        ALTER TABLE proactive_message_log ADD COLUMN IF NOT EXISTS agent_id TEXT;
        ALTER TABLE proactive_message_log ALTER COLUMN sent_at DROP NOT NULL;

        CREATE TABLE IF NOT EXISTS daily_briefing_settings (
            user_id TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            preferred_hour INTEGER DEFAULT 8,
            channel TEXT DEFAULT 'email',
            email TEXT,
            whatsapp_contact_jid TEXT,
            last_sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // Ensure there's a default user or similar? (Admin created by another script)

    // Ensure subscription plans exist and sync their properties (like stripe_price_id)
    // Migration: subscription_plans - price_yearly and stripe_price_id_yearly
    try {
        await db.run('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_yearly INTEGER');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('subscription_plans migration:', e?.message);
        }
    }

    // Migration: agents - calendar_tool_id and outlook_tool_id
    try {
        await db.run('ALTER TABLE agents ADD COLUMN IF NOT EXISTS calendar_tool_id TEXT');
        await db.run('ALTER TABLE agents ADD COLUMN IF NOT EXISTS outlook_tool_id TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('agents tools columns migration:', e?.message);
        }
    }

    try {
        const countRow = await db.get('SELECT COUNT(*) as count FROM subscription_plans');
        if (!countRow || parseInt(countRow.count) === 0) {
            // Seed all default plans
            for (const plan of defaultPlans) {
                await db.run(`
                    INSERT INTO subscription_plans (
                        id, name, display_name, description, price, price_currency, 
                        sort_order, is_default, limits, features,
                        price_yearly
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (name) DO NOTHING
                `, 
                    plan.id, plan.name, plan.display_name, plan.description, plan.price, plan.price_currency, 
                    plan.sort_order, plan.is_default, plan.limits, plan.features,
                    plan.price_yearly || null
                );
            }
        } else {
            // Update plans if missing properties we have in default
            for (const plan of defaultPlans) {
                if (plan.price_yearly) {
                    await db.run(`
                        UPDATE subscription_plans 
                        SET price_yearly = ? 
                        WHERE name = ? AND (price_yearly IS NULL OR price_yearly = 0)
                    `, plan.price_yearly, plan.name);
                }
                
                // Migration: add leads_management to features if missing
                try {
                    const dbPlan = await db.get('SELECT features FROM subscription_plans WHERE name = ?', plan.name);
                    if (dbPlan) {
                        const features = JSON.parse(dbPlan.features || '{}');
                        if (features.leads_management === undefined) {
                            const defaultFeats = JSON.parse(plan.features || '{}');
                            features.leads_management = defaultFeats.leads_management;
                            await db.run(
                                'UPDATE subscription_plans SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
                                JSON.stringify(features),
                                plan.name
                            );
                            console.log(`[Migration] Added leads_management to plan ${plan.name}`);
                        }
                    }
                } catch (err) {
                    console.warn(`[Migration] Failed to update features for ${plan.name}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.error('Failed to seed subscription plans:', e?.message || e);
    }

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS subscription_coupons (
                id TEXT PRIMARY KEY,
                name TEXT,
                code TEXT UNIQUE NOT NULL,
                discount_type TEXT NOT NULL DEFAULT 'percentage',
                discount_value DOUBLE PRECISION NOT NULL,
                max_uses INTEGER,
                used_count INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('Failed to create coupons table:', e?.message);
    }

    try {
        await db.run('ALTER TABLE subscription_coupons ADD COLUMN IF NOT EXISTS name TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('subscription_coupons name column migration:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE subscription_coupons ADD COLUMN IF NOT EXISTS influencer_id TEXT');
        await db.run('ALTER TABLE subscription_coupons ADD COLUMN IF NOT EXISTS influencer_reward_type TEXT DEFAULT \'none\'');
        await db.run('ALTER TABLE subscription_coupons ADD COLUMN IF NOT EXISTS influencer_reward_value REAL DEFAULT 0');
        await db.run('ALTER TABLE subscription_coupons ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0');
    } catch (e) {
        console.warn('subscription_coupons influencer columns migration:', e?.message);
    }

    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS coupon_usages (
                id TEXT PRIMARY KEY,
                coupon_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                subscription_id TEXT,
                amount_total REAL,
                discount_amount REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (coupon_id) REFERENCES subscription_coupons(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);
            CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscription_coupons_influencer ON subscription_coupons(influencer_id);
        `);
    } catch (e) {
        console.error('Failed to create coupon_usages table:', e?.message);
    }

    // Seed Influencer Role
    try {
        const influencerRole = ['influencer', 'Influencer', 'Accès au dashboard coupon et suivi des usages'];
        await db.run(
            `INSERT INTO roles (id, key, name, description)
             VALUES (gen_random_uuid(), ?, ?, ?)
             ON CONFLICT (key) DO NOTHING`,
            influencerRole[0], influencerRole[1], influencerRole[2]
        );
    } catch (e) {
        console.warn('Influencer role seed skipped:', e?.message);
    }

    try {
        await db.run('ALTER TABLE saas_subscription_payments ADD COLUMN IF NOT EXISTS coupon_code TEXT');
        await db.run('ALTER TABLE saas_subscription_payments ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION DEFAULT 0');
        await db.run('ALTER TABLE saas_subscription_payments ADD COLUMN IF NOT EXISTS original_amount DOUBLE PRECISION');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('saas_subscription_payments coupon columns migration:', e?.message);
        }
    }

    try {
        await db.run("UPDATE users SET role = 'owner' WHERE role IS NULL");
    } catch (e) {
        console.warn('User role default migration:', e?.message);
    }

    try {
        await db.run('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_status_reply INTEGER DEFAULT 0');
        await db.run('ALTER TABLE messages ADD COLUMN IF NOT EXISTS quoted_content TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('messages migration error:', e?.message);
        }
    }

    try {
        await db.run('ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS caption TEXT');
        await db.run('ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS mime_type TEXT');
        await db.run('ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT');
        await db.run('ALTER TABLE whatsapp_statuses ADD COLUMN IF NOT EXISTS whatsapp_message_key TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('whatsapp_statuses migration error:', e?.message);
        }
    }


    // Migration: Module 15 - Sondages WhatsApp
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS polls (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                title TEXT NOT NULL,
                question TEXT NOT NULL,
                options TEXT NOT NULL DEFAULT '[]',
                allow_multiple INTEGER DEFAULT 0,
                target_jids TEXT,
                status TEXT DEFAULT 'draft',
                wa_message_id TEXT,
                wa_message_key TEXT,
                wa_message_full TEXT,
                total_recipients INTEGER DEFAULT 0,
                total_votes INTEGER DEFAULT 0,
                results TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                closed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_polls_user ON polls(user_id);
            CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
        `);
        
        // Ensure columns exist for existing DBs
        try {
            await db.run('ALTER TABLE polls ADD COLUMN IF NOT EXISTS wa_message_full TEXT');
            await db.run('ALTER TABLE polls ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0');
        } catch(e) {}

        await db.exec(`
            CREATE TABLE IF NOT EXISTS poll_recipients (
                id SERIAL PRIMARY KEY,
                poll_id TEXT NOT NULL,
                contact_jid TEXT NOT NULL,
                contact_name TEXT,
                wa_message_id TEXT,
                wa_message_key TEXT,
                wa_message_full TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_poll_recipients_poll ON poll_recipients(poll_id);
            CREATE INDEX IF NOT EXISTS idx_poll_recipients_wa_id ON poll_recipients(wa_message_id);
        `);

        try {
            await db.run('ALTER TABLE poll_recipients ADD COLUMN IF NOT EXISTS wa_message_full TEXT');
            await db.run('ALTER TABLE poll_recipients ADD COLUMN IF NOT EXISTS contact_name TEXT');
        } catch(e) {}

        await db.exec(`
            CREATE TABLE IF NOT EXISTS poll_votes (
                id SERIAL PRIMARY KEY,
                poll_id TEXT NOT NULL,
                voter_jid TEXT NOT NULL,
                selected_options TEXT NOT NULL DEFAULT '[]',
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique_voter ON poll_votes(poll_id, voter_jid);
        `);
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('polls migration error:', e?.message);
        }
    }

    // Migration: Module 16 - Deals management
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS deals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                contact_name TEXT,
                contact_phone TEXT,
                lead_id TEXT,
                amount DOUBLE PRECISION DEFAULT 0,
                currency TEXT DEFAULT 'XOF',
                stage TEXT DEFAULT 'qualification', -- qualification, proposal, negotiation, closed_won, closed_lost
                probability INTEGER DEFAULT 0,
                expected_close_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_deals_user ON deals(user_id);
            CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
            CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals(lead_id);
        `);
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('deals migration error:', e?.message);
        }
    }

    // Migration: deals_module_enabled per user
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS deals_module_enabled INTEGER DEFAULT 1');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.deals_module_enabled migration:', e?.message);
        }
    }

    console.log('PostgreSQL schema initialized successfully');

}

export default db;
