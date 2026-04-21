import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useModuleAvailability() {
  const { user } = useAuth()

  const checkStatus = useMemo(() => (key, feat, override) => {
    if (!user) return { enabled: false, locked: true };
    
    // Admin bypass
    if (user.is_admin === 1) return { enabled: true, locked: false };

    // Vérification exhaustive des overrides
    const isOverrideTrue = (
      override === 1 || override === '1' || override === true ||
      user[`${key}_enabled`] === 1 || user[`${key}_enabled`] === true ||
      user[`${key}_module_enabled`] === 1 || user[`${key}_module_enabled`] === true
    );
    const isOverrideFalse = (
      override === 0 || override === '0' ||
      user[`${key}_enabled`] === 0 ||
      user[`${key}_module_enabled`] === 0
    );

    // Propriétaires : Forfait (feat) OU Override True
    if (!user?.parent_user_id || user?.role === 'owner') {
      if (isOverrideFalse) return { enabled: false, locked: false }; // Bloqué manuellement, pas forcément par le plan
      
      const enabled = !!feat || isOverrideTrue;
      // Il est verrouillé s'il n'est pas activé par le plan ET qu'il n'y a pas d'override manuel positif
      const locked = !enabled && !isOverrideTrue; 
      
      return { enabled, locked };
    }

    // Gérants : Uniquement si explicitement débloqué par le propriétaire
    return { enabled: isOverrideTrue, locked: !isOverrideTrue };
  }, [user]);

  const modules = useMemo(() => {
    const status = {
      payment: checkStatus('payment_module', user?.plan_features?.payment_module, user?.payment_module_enabled),
      analytics: checkStatus('analytics_module', user?.plan_features?.analytics, user?.analytics_module_enabled),
      flows: checkStatus('flows_module', user?.plan_features?.flows, user?.flows_module_enabled),
      leads: checkStatus('leads_management', user?.plan_features?.leads_management, user?.leads_management_enabled),
      whatsappStatus: checkStatus('whatsapp_status', user?.plan_features?.whatsapp_status, user?.whatsapp_status_enabled),
      catalogImport: checkStatus('catalog_import', user?.plan_features?.catalog_import, user?.catalog_import_enabled),
      knowledgeBase: checkStatus('knowledge_base', user?.plan_features?.knowledge_base, user?.knowledge_base_enabled),
      campaigns: checkStatus('campaigns_module', user?.plan_features?.campaigns, user?.campaigns_module_enabled),
      deals: checkStatus('deals', user?.plan_features?.deals_management, user?.deals_module_enabled),
      reports: checkStatus('reports_module', user?.plan_features?.reports, user?.reports_module_enabled),
    };

    return {
      ...Object.keys(status).reduce((acc, key) => ({ ...acc, [key]: status[key].enabled }), {}),
      status,
      isInfluencerOnly: user?.influencer_only === true,
      isAdmin: user?.is_admin === 1,
      subscriptionStatus: user?.subscription_status || 'active'
    };
  }, [user, checkStatus]);

  return modules;
}
