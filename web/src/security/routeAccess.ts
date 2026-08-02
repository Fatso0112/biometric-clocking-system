import { getRoleHomePath, type RoleHomePath } from '../types/navigation';
import type { UserRole } from '../types/session';

export interface SessionAccessSnapshot {
  employeeNumber: string | null;
  authorizedRoles: readonly UserRole[];
  activeRole: UserRole | null;
}

export type RouteAccessDecision =
  | { outcome: 'allow' }
  | { outcome: 'redirect'; to: '/' | RoleHomePath };

export function getRouteAccessDecision(
  session: SessionAccessSnapshot,
  requiredRole?: UserRole,
): RouteAccessDecision {
  const { employeeNumber, authorizedRoles, activeRole } = session;
  if (!employeeNumber || !activeRole || !authorizedRoles.includes(activeRole)) {
    return { outcome: 'redirect', to: '/' };
  }

  if (requiredRole && activeRole !== requiredRole) {
    return { outcome: 'redirect', to: getRoleHomePath(activeRole) };
  }

  return { outcome: 'allow' };
}
