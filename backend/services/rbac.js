import db from '../database/init.js';

/**
 * RBAC helpers (roles/permissions).
 *
 * Backwards-compatibility:
 * - If RBAC tables are missing or empty, we fall back to legacy user flags:
 *   is_admin, can_manage_users, can_manage_plans, can_view_stats, can_manage_ai
 */

const LEGACY_FLAG_TO_PERMS = {
  can_manage_users: [
    'users.read',
    'users.write',
    'users.credentials.reset',
    'users.credits.write',
    'users.delete'
  ],
  can_manage_plans: [
    'billing.plans.read',
    'billing.plans.write',
    'billing.coupons.read',
    'billing.coupons.write',
    'billing.subscriptions.write'
  ],
  can_manage_ai: [
    'ai.models.read',
    'ai.models.write',
    'ai.keys.read',
    'ai.keys.write',
    'ai.settings.write',
    'ai.reindex.run'
  ],
  can_view_stats: [
    'platform.stats.read',
    'audit.read',
    'security.anomalies.read',
    'platform.activity.read'
  ],
  can_manage_tickets: [
    'support.tickets.read',
    'support.tickets.reply',
    'support.tickets.status',
    'support.tickets.assign'
  ]
};

const FULL_ADMIN_PERMS = [
  // everything we currently gate in admin routes
  ...new Set(Object.values(LEGACY_FLAG_TO_PERMS).flat()),
  // sensitive operations
  'audit.rollback',
  'security.anomalies.manage'
];

function toBool(v) {
  return v === 1 || v === true || v === '1';
}

async function getLegacyFlags(userId) {
  if (!userId) return null;
  const u = await db.get(
    `SELECT is_admin, can_manage_users, can_manage_plans, can_view_stats, can_manage_ai, can_manage_tickets
     FROM users WHERE id = ?`,
    userId
  );
  if (!u) return null;
  return {
    is_admin: toBool(u.is_admin),
    can_manage_users: toBool(u.can_manage_users),
    can_manage_plans: toBool(u.can_manage_plans),
    can_view_stats: toBool(u.can_view_stats),
    can_manage_ai: toBool(u.can_manage_ai),
    can_manage_tickets: toBool(u.can_manage_tickets)
  };
}

export async function getUserPermissions(userId) {
  // 1) Try RBAC tables
  try {
    const rows = await db.all(
      `
      SELECT DISTINCT p.key
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = ?
      `,
      userId
    );
    const keys = (rows || []).map((r) => r.key).filter(Boolean);
    if (keys.length > 0) return keys.sort();
  } catch {
    // ignore and fallback
  }

  // 2) Fallback to legacy flags
  const flags = await getLegacyFlags(userId);
  if (!flags) return [];

  if (flags.is_admin) {
    return [...new Set(FULL_ADMIN_PERMS)].sort();
  }

  const perms = new Set();
  for (const [flag, list] of Object.entries(LEGACY_FLAG_TO_PERMS)) {
    if (flags[flag]) list.forEach((p) => perms.add(p));
  }
  return [...perms].sort();
}

export async function userHasPermission(userId, permissionKey) {
  if (!permissionKey) return false;
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
}

