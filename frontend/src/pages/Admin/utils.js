/** Fallback crédits par plan quand la liste des plans est vide */
export const DEFAULT_CREDITS_BY_PLAN = { free: 100, starter: 1500, pro: 5000, enterprise: -1 }

export function getCreditsForPlan(plans, planId) {
  const plan = plans.find(p => p.name === planId || p.id === planId)
  if (plan?.limits?.credits_per_month != null) return plan.limits.credits_per_month
  return DEFAULT_CREDITS_BY_PLAN[planId] ?? 100
}
