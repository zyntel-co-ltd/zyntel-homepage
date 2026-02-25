/** Role type used across the app */
export type Role = 'admin' | 'manager' | 'technician' | 'viewer';

/** Access charts: admin, manager */
export function canAccessCharts(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager';
}

/** Access tables: admin, manager, technician */
export function canAccessTables(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager' || role === 'technician';
}

/** Access LRIDS: admin, manager (nav), viewer (LRIDS only) */
export function canAccessLRIDS(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager' || role === 'viewer';
}

/** Access admin panel: admin, manager */
export function canAccessAdmin(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager';
}

/** Export data: admin, manager (NOT technician) */
export function canExport(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager';
}

/** Delete user: admin only */
export function canDeleteUser(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin';
}

/** Reset password: admin only */
export function canResetPassword(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin';
}

/** Deactivate user: admin, manager */
export function canDeactivateUser(role?: Role): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'manager';
}

export function isViewer(role?: Role): boolean {
  return role === 'viewer';
}

export function isTechnician(role?: Role): boolean {
  return role === 'technician';
}

export function isManager(role?: Role): boolean {
  return role === 'manager';
}

export function isAdmin(role?: Role): boolean {
  return role === 'admin';
}
