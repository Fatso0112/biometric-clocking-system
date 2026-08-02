import type {
  AuthenticatedIdentity,
  UserRole,
} from "../types/session";
import {
  ApiError,
  apiRequest,
} from "./httpClient";

export interface AuthenticationRequest {
  email: string;
  password: string;
}

interface BackendUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  isActive: boolean;
  roles: string[];
}

interface BackendAuthenticationResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  user: BackendUser;
}

export interface AuthenticationSuccessResponse {
  status: "authenticated";
  identity: AuthenticatedIdentity;
}

export interface AuthenticationFailureResponse {
  status:
    | "invalid_credentials"
    | "inactive"
    | "unsupported_role"
    | "unavailable";

  message: string;
}

export type AuthenticationResponse =
  | AuthenticationSuccessResponse
  | AuthenticationFailureResponse;

const ROLE_PRIORITY: readonly UserRole[] = [
  "admin",
  "hr",
  "supervisor",
  "employee",
];

function mapBackendRole(
  backendRole: string,
): UserRole | null {
  switch (backendRole) {
    case "SystemAdministrator":
      return "admin";

    case "HROfficer":
      return "hr";

    case "Supervisor":
      return "supervisor";

    case "Employee":
      return "employee";

    default:
      return null;
  }
}

export async function authenticate(
  request: AuthenticationRequest,
): Promise<AuthenticationResponse> {
  try {
    const response =
      await apiRequest<BackendAuthenticationResponse>(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: request.email.trim(),
            password: request.password,
          }),
        },
      );

    if (!response.user.isActive) {
      return {
        status: "inactive",
        message:
          "This account is inactive. Contact an administrator.",
      };
    }

    const authorizedRoles = Array.from(
      new Set(
        response.user.roles
          .map(mapBackendRole)
          .filter(
            (role): role is UserRole =>
              role !== null,
          ),
      ),
    );

    const activeRole = ROLE_PRIORITY.find(
      (role) => authorizedRoles.includes(role),
    );

    if (!activeRole) {
      return {
        status: "unsupported_role",
        message:
          "This account does not have access to a supported portal.",
      };
    }

    return {
      status: "authenticated",
      identity: {
        userId: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        employeeId: response.user.employeeId,
        employeeNumber: null,

        authorizedRoles,
        activeRole,

        accessToken: response.accessToken,
        accessTokenExpiresAtUtc:
          response.accessTokenExpiresAtUtc,
        refreshToken: response.refreshToken,
        refreshTokenExpiresAtUtc:
          response.refreshTokenExpiresAtUtc,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return {
          status: "invalid_credentials",
          message:
            "The email address or password is incorrect.",
        };
      }

      return {
        status: "unavailable",
        message: error.message,
      };
    }

    return {
      status: "unavailable",
      message:
        "Login failed unexpectedly. Please try again.",
    };
  }
}