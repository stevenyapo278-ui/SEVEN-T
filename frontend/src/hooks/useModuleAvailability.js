import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useModuleAvailability() {
  const { user } = useAuth()

  const isEnabled = useMemo(() => (key, feat, override) => {
    if (!user) return false;
    
    // Vérification exhaustive des overrides (noms de colonnes possibles)
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

    // Propriétaires (ceux qui n'ont pas de parent) : Forfait (feat) OU Override True
    if (!user?.parent_user_id || user?.role === 'owner') {
      if (isOverrideFalse) return false; // Bloqué manuellement
      return !!feat || isOverrideTrue;
    }

    // Gérants : Uniquement si explicitement débloqué par le propriétaire
    return isOverrideTrue;
  }, [user]);

  const modules = useMemo(() => ({
    payment: isEnabled('payment_module', user?.plan_features?.payment_module, user?.payment_module_enabled),
    analytics: isEnabled('analytics_module', user?.plan_features?.analytics, user?.analytics_module_enabled),
    flows: isEnabled('flows_module', user?.plan_features?.flows, user?.flows_module_enabled),
    leads: isEnabled('leads_management', user?.plan_features?.leads_management, user?.leads_management_enabled),
    whatsappStatus: isEnabled('whatsapp_status', user?.plan_features?.whatsapp_status, user?.whatsapp_status_enabled),
    catalogImport: isEnabled('catalog_import', user?.plan_features?.catalog_import, user?.catalog_import_enabled),
    knowledgeBase: isEnabled('knowledge_base', user?.plan_features?.knowledge_base, user?.knowledge_base_enabled),
    campaigns: isEnabled('campaigns_module', user?.plan_features?.campaigns, user?.campaigns_module_enabled),
    isInfluencerOnly: user?.influencer_only === true,
    isAdmin: user?.is_admin === 1
  }), [user, isEnabled]);

  return modules;
}
