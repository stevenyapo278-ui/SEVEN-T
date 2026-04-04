/**
 * Default subscription plans - single source of truth for seed and admin restore.
 * Used by database/init.js (seed when table empty) and adminPlans.js (restore-defaults).
 */

export const defaultPlans = [
    {
        id: 'free',
        name: 'free',
        display_name: 'Essai Gratuit',
        description: 'Découvrir la plateforme avec WhatsApp (Essai de 7 jours)',
        price: 0,
        price_currency: 'XOF',
        sort_order: 1,
        is_default: 1,
        price_yearly: 0,
        limits: JSON.stringify({
            agents: 1,
            whatsapp_accounts: 1,

            outlook_accounts: 0,
            google_calendar_accounts: 0,
            conversations_per_month: 50,
            messages_per_month: 500,
            credits_per_month: 500,
            knowledge_items: 10,
            templates: 5
        }),
        features: JSON.stringify({
            models: ['gemini-1.5-flash'],
            availability_hours: false,
            voice_responses: false,
            payment_module: false,
            reports: false,
            next_best_action: false,
            conversion_score: false,
            daily_briefing: false,
            sentiment_routing: false,
            catalog_import: false,
            human_handoff_alerts: false,
            analytics: false,
            leads_management: false
        })
    },
    {
        id: 'starter',
        name: 'starter',
        display_name: 'Starter',
        description: 'Pour démarrer avec un numéro WhatsApp',
        price: 15000,
        price_currency: 'XOF',
        sort_order: 2,
        is_default: 0,
        price_yearly: 150000,
        limits: JSON.stringify({
            agents: 1,
            whatsapp_accounts: 1,
            outlook_accounts: 1,
            google_calendar_accounts: 1,
            conversations_per_month: 300,
            messages_per_month: 1500,
            credits_per_month: 1500,
            knowledge_items: 25,
            templates: 15
        }),
        features: JSON.stringify({
            models: ['gemini-1.5-flash', 'gpt-4o-mini'],
            availability_hours: true,
            voice_responses: true,
            payment_module: false,
            reports: false,
            next_best_action: false,
            conversion_score: false,
            daily_briefing: false,
            sentiment_routing: false,
            catalog_import: false,
            human_handoff_alerts: false,
            analytics: false,
            leads_management: true
        })
    },
    {
        id: 'pro',
        name: 'pro',
        display_name: 'Pro',
        description: 'Pour les entreprises en croissance',
        price: 35000,
        price_currency: 'XOF',
        sort_order: 3,
        is_default: 0,
        price_yearly: 350000,
        limits: JSON.stringify({
            agents: 2,
            whatsapp_accounts: 2,

            outlook_accounts: 2,
            google_calendar_accounts: 2,
            conversations_per_month: 1500,
            messages_per_month: 5000,
            credits_per_month: 5000,
            knowledge_items: 100,
            templates: 50
        }),
        features: JSON.stringify({
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            reports: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true,
            analytics: true,
            leads_management: true
        })
    },
    {
        id: 'business',
        name: 'business',
        display_name: 'Business',
        description: 'Pour les grandes équipes',
        price: 99000,
        price_currency: 'XOF',
        sort_order: 4,
        is_default: 0,
        price_yearly: 990000,
        limits: JSON.stringify({
            agents: 4,
            whatsapp_accounts: 4,

            outlook_accounts: 4,
            google_calendar_accounts: 4,
            conversations_per_month: 5000,
            messages_per_month: 20000,
            credits_per_month: 20000,
            knowledge_items: 500,
            templates: 200
        }),
        features: JSON.stringify({
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            reports: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true,
            analytics: true,
            leads_management: true
        })
    },
    {
        id: 'enterprise',
        name: 'enterprise',
        display_name: 'Enterprise',
        description: 'Solution sur mesure',
        price: -1,
        price_currency: 'XOF',
        sort_order: 5,
        is_default: 0,
        price_yearly: -1,
        limits: JSON.stringify({
            agents: -1,
            whatsapp_accounts: -1,

            outlook_accounts: -1,
            google_calendar_accounts: -1,
            conversations_per_month: -1,
            messages_per_month: -1,
            credits_per_month: -1,
            knowledge_items: -1,
            templates: -1
        }),
        features: JSON.stringify({
            models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'gpt-4o'],
            availability_hours: true,
            voice_responses: true,
            payment_module: true,
            reports: true,
            next_best_action: true,
            conversion_score: true,
            daily_briefing: true,
            sentiment_routing: true,
            catalog_import: true,
            human_handoff_alerts: true,
            analytics: true,
            leads_management: true
        })
    }
];
