import {
  getRoleHomePath,
  type RoleHomePath,
} from "../types/navigation";
import type { UserRole } from "../types/session";

export interface SessionAccessSnapshot {
  userId: string | null;
  authorizedRoles: readonly UserRole[];
  activeRole: UserRole | null;
}

export type RouteAccessDecision =
  | { outcome: "allow" }
  | {
      outcome: "redirect";
      to: "/" | RoleHomePath;
    };

export function getRouteAccessDecision(
  session: SessionAccessSnapshot,
  requiredRole?: UserRole,
): RouteAccessDecision {
  const {
    userId,
    authorizedRoles,
    activeRole,
  } = session;

  if (
    !userId ||
    !activeRole ||
    !authorizedRoles.includes(activeRole)
  ) {
    return {
      outcome: "redirect",
      to: "/",
    };
  }

  if (
    requiredRole &&
    activeRole !== requiredRole
  ) {
    return {
      outcome: "redirect",
      to: getRoleHomePath(activeRole),
    };
  }

  return {
    outcome: "allow",
  };
}