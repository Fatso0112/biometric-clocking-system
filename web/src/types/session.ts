export const USER_ROLES = [
  "employee",
  "supervisor",
  "hr",
  "admin",
  "payroll",
  "executive"
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticatedIdentity {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  employeeNumber: string | null;

  authorizedRoles: readonly UserRole[];
  activeRole: UserRole;

  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}

export function isUserRole(
  value: unknown,
): value is UserRole {
  return (
    typeof value === "string" &&
    USER_ROLES.some((role) => role === value)
  );
}