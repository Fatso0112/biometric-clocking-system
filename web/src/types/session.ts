export const USER_ROLES = ['employee', 'supervisor', 'hr', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticatedIdentity {
  employeeNumber: string;
  authorizedRoles: readonly UserRole[];
  activeRole: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.some((role) => role === value);
}
