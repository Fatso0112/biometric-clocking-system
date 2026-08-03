import type {
  AuthenticatedIdentity,
  UserRole,
} from '../types/session';
import {
  ApiError,
  apiRequest,
} from './httpClient';

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
  employeeNumber?: string | null;
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
  status: 'authenticated';
  identity: AuthenticatedIdentity;
}

export interface AuthenticationFailureResponse {
  status:
    | 'invalid_credentials'
    | 'inactive'
    | 'unsupported_role'
    | 'unavailable';

  message: string;
}

export type AuthenticationResponse =
  | AuthenticationSuccessResponse
  | AuthenticationFailureResponse;

const ROLE_PRIORITY: readonly UserRole[] = [
  'admin',
  'hr',
  'supervisor',
  'employee',
];

function mapBackendRole(
  backendRole: string,
): UserRole | null {
  switch (backendRole) {
    case 'SystemAdministrator':
      return 'admin';
    case 'HROfficer':
      return 'hr';
    case 'Supervisor':
      return 'supervisor';
    case 'Employee':
      return 'employee';
    default:
      return null;
  }
}

function mapAuthenticationResponse(
  response: BackendAuthenticationResponse,
  preferredRole?: UserRole | null,
): AuthenticationResponse {
  if (!response.user.isActive) {
    return {
      status: 'inactive',
      message:
        'This account is inactive. Contact an administrator.',
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

  const activeRole =
    preferredRole &&
    authorizedRoles.includes(preferredRole)
      ? preferredRole
      : ROLE_PRIORITY.find((role) =>
          authorizedRoles.includes(role),
        );

  if (!activeRole) {
    return {
      status: 'unsupported_role',
      message:
        'This account does not have access to a supported portal.',
    };
  }

  return {
    status: 'authenticated',
    identity: {
      userId: response.user.id,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      employeeId: response.user.employeeId,
      employeeNumber:
        response.user.employeeNumber?.trim() || null,
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
}

function mapApiFailure(
  error: unknown,
  invalidCredentialsMessage: string,
): AuthenticationFailureResponse {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        status: 'invalid_credentials',
        message: invalidCredentialsMessage,
      };
    }

    if (error.status === 403 || error.status === 423) {
      return {
        status: 'inactive',
        message: error.message,
      };
    }

    return {
      status: 'unavailable',
      message: error.message,
    };
  }

  return {
    status: 'unavailable',
    message:
      'Authentication failed unexpectedly. Please try again.',
  };
}

export async function authenticate(
  request: AuthenticationRequest,
): Promise<AuthenticationResponse> {
  try {
    const response =
      await apiRequest<BackendAuthenticationResponse>(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: request.email.trim(),
            password: request.password,
          }),
        },
      );

    return mapAuthenticationResponse(response);
  } catch (error) {
    return mapApiFailure(
      error,
      'The email address or password is incorrect.',
    );
  }
}

export async function refreshAuthentication(
  refreshToken: string,
  preferredRole?: UserRole | null,
): Promise<AuthenticationResponse> {
  try {
    const response =
      await apiRequest<BackendAuthenticationResponse>(
        '/api/v1/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({
            refreshToken,
          }),
        },
      );

    return mapAuthenticationResponse(
      response,
      preferredRole,
    );
  } catch (error) {
    return mapApiFailure(
      error,
      'Your session has expired. Please log in again.',
    );
  }
}

export async function revokeAuthentication(
  refreshToken: string,
): Promise<void> {
  try {
    await apiRequest<void>(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({
          refreshToken,
        }),
      },
    );
  } catch {
    // Local sign-out must still complete when the backend is unavailable.
  }
}
