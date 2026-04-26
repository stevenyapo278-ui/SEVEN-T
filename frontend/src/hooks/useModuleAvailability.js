import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useModuleAvailability() {
  const { user } = useAuth()

  const checkStatus = useMemo(() => (key, feat, override) => {
    if (!user) return { enabled: false, locked: true };
    
    // Définition des flags d'override
    const isOverrideTrue = (
      override === 1 || override === '1' || override === true ||
      user[`${key}_enabled`] == 1 || user[`${key}_enabled`] === true ||
      user[`${key}_module_enabled`] == 1 || user[`${key}_module_enabled`] === true
    );
    const isOverrideFalse = (
      override === 0 || override === '0' || override === false ||
      user[`${key}_enabled`] === 0 || user[`${key}_enabled`] === '0' ||
      user[`${key}_module_enabled`] === 0 || user[`${key}_module_enabled`] === '0'
    );

    // 1. Bypass administrateur (toujours accès à tout)
    if (user.is_admin == 1 || user.is_admin === true) return { enabled: true, locked: false };

    // 2. Désactivation manuelle explicite (Override False)
    if (isOverrideFalse) return { enabled: false, locked: false };

    // 3. Activation manuelle explicite (Override True)
    if (isOverrideTrue) return { enabled: true, locked: false };

    // 4. Logique par rôle
    // Propriétaires : Forfait (feat)
    if (!user?.parent_user_id || user?.role === 'owner') {
      const enabled = !!feat;
      const locked = !enabled; // Si pas dans le plan, c'est verrouillé (upsell)
      
      return { enabled, locked };
    }

    // Gérants/Employés : Uniquement si activé (déjà géré par override ou feat ci-dessus)
    // Mais par défaut, s'ils n'ont pas d'override et que ce n'est pas le owner, on bloque
    return { enabled: false, locked: true };
  }, [user]);

  const modules = useMemo(() => {
    const status = {
      availability: checkStatus('availability_hours', user?.plan_features?.availability_hours, user?.availability_hours_enabled),
      payment: checkStatus('payment_module', user?.plan_features?.payment_module, user?.payment_module_enabled),
      nextBestAction: checkStatus('next_best_action', user?.plan_features?.next_best_action, user?.next_best_action_enabled),
      conversionScore: checkStatus('conversion_score', user?.plan_features?.conversion_score, user?.conversion_score_enabled),
      dailyBriefing: checkStatus('daily_briefing', user?.plan_features?.daily_briefing, user?.daily_briefing_enabled),
      sentimentRouting: checkStatus('sentiment_routing', user?.plan_features?.sentiment_routing, user?.sentiment_routing_enabled),
      catalogImport: checkStatus('catalog_import', user?.plan_features?.catalog_import, user?.catalog_import_enabled),
      humanHandoff: checkStatus('human_handoff_alerts', user?.plan_features?.human_handoff_alerts, user?.human_handoff_alerts_enabled),
      analytics: checkStatus('analytics_module', user?.plan_features?.analytics, user?.analytics_module_enabled),
      flows: checkStatus('flows_module', user?.plan_features?.flows, user?.flows_module_enabled),
      whatsappStatus: checkStatus('whatsapp_status', user?.plan_features?.whatsapp_status, user?.whatsapp_status_enabled),
      leads: checkStatus('leads_management', user?.plan_features?.leads_management, user?.leads_management_enabled),
      campaigns: checkStatus('campaigns_module', user?.plan_features?.campaigns, user?.campaigns_module_enabled),
      deals: checkStatus('deals', user?.plan_features?.deals_management, user?.deals_module_enabled),
      reports: checkStatus('reports_module', user?.plan_features?.reports, user?.reports_module_enabled),
      voice: checkStatus('voice_responses', user?.plan_features?.voice_responses, user?.voice_responses_enabled),
      polls: checkStatus('polls', user?.plan_features?.polls, user?.polls_module_enabled),
      proactiveAdvisor: checkStatus('next_best_action', user?.plan_features?.next_best_action, user?.next_best_action_enabled),
    };

    return {
      ...Object.keys(status).reduce((acc, key) => ({ ...acc, [key]: status[key].enabled }), {}),
      status,
      isInfluencerOnly: user?.influencer_only === true,
      isAdmin: user?.is_admin == 1 || user?.is_admin === true,
      subscriptionStatus: user?.subscription_status || 'active'
    };
  }, [user, checkStatus]);

  return modules;
}
