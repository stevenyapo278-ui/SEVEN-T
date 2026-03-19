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
  let u;
  try {
    u = await db.get(
      `SELECT * FROM users WHERE id = ?`,
      userId
    );
  } catch (e) {
    console.error('getLegacyFlags error:', e.message);
    return null;
  }
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
  const perms = new Set();

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
    (rows || []).forEach((r) => {
      if (r.key) perms.add(r.key);
    });
  } catch {
    // ignore RBAC errors
  }

  // 2) Always add legacy flags permissions (additive)
  try {
    const flags = await getLegacyFlags(userId);
    if (flags) {
      if (flags.is_admin) {
        FULL_ADMIN_PERMS.forEach((p) => perms.add(p));
      } else {
        for (const [flag, list] of Object.entries(LEGACY_FLAG_TO_PERMS)) {
          if (flags[flag]) list.forEach((p) => perms.add(p));
        }
      }
    }
  } catch {
    // ignore legacy flag errors
  }

  return [...perms].sort();
}

export async function userHasPermission(userId, permissionKey) {
  if (!permissionKey) return false;
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
}

