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
        connectionString
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
            plan TEXT DEFAULT 'free',
            credits INTEGER DEFAULT 100,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            subscription_status TEXT DEFAULT 'active',
            subscription_end_date TIMESTAMP,
            currency TEXT DEFAULT 'XOF',
            media_model TEXT,
            google_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
            validated_by TEXT,
            validated_at TIMESTAMP,
            rejected_at TIMESTAMP,
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

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
            status TEXT DEFAULT 'pending',
            paid_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, model_id)
        );

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
            stripe_price_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active);
        CREATE INDEX IF NOT EXISTS idx_plans_order ON subscription_plans(sort_order);
    `);

    // Seed default AI models if needed (PostgreSQL may return count as string/bigint)
    const modelCountRow = await db.get('SELECT COUNT(*) as count FROM ai_models');
    const modelCount = Number(modelCountRow?.count ?? 0);
    if (modelCount === 0) {
        const defaultModels = [
            // Google Gemini
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', model_id: 'models/gemini-2.5-flash', description: 'Dernier modèle Google, très rapide', credits: 1, category: 'fast', order: 1 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', model_id: 'gemini-1.5-flash', description: 'Rapide et efficace', credits: 1, category: 'fast', order: 2 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', model_id: 'gemini-1.5-pro', description: 'Intelligent et polyvalent', credits: 2, category: 'smart', order: 3 },
            // OpenAI
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model_id: 'gpt-4o-mini', description: 'Rapide et économique', credits: 1, category: 'fast', order: 10 },
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', model_id: 'gpt-4o', description: 'Modèle phare OpenAI', credits: 3, category: 'smart', order: 11 },
            // OpenRouter Free
            { id: 'deepseek-r1t-chimera', name: 'DeepSeek R1T Chimera', provider: 'openrouter', model_id: 'tngtech/deepseek-r1t-chimera:free', description: 'Gratuit, bon raisonnement', credits: 0, category: 'free', order: 20, is_free: 1 },
            { id: 'qwen3-80b', name: 'Qwen3 80B', provider: 'openrouter', model_id: 'qwen/qwen3-next-80b-a3b-instruct:free', description: 'Gratuit, très puissant', credits: 0, category: 'free', order: 21, is_free: 1 }
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

    // Migration: add payment_url_external for PaymeTrust (redirect URL)
    try {
        await db.run('ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS payment_url_external TEXT');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('payment_links.payment_url_external column migration:', e?.message);
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

    // Migration: users.payment_module_enabled (module Moyens de paiement visible si admin l'active)
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_module_enabled INTEGER DEFAULT 0');
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.payment_module_enabled column migration:', e?.message);
        }
    }

    // Migration: users.parent_user_id (mode agence - sous-comptes)
    try {
        await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id TEXT');
        const hasFk = await db.get(
            "SELECT 1 FROM pg_constraint WHERE conname = 'users_parent_user_id_fkey'"
        );
        if (!hasFk) {
            await db.run(`
                ALTER TABLE users ADD CONSTRAINT users_parent_user_id_fkey
                FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL
            `);
        }
    } catch (e) {
        if (!/already exists/i.test(e?.message || '')) {
            console.warn('users.parent_user_id column migration:', e?.message);
        }
    }

    console.log('PostgreSQL schema initialized successfully');
}

export default db;

