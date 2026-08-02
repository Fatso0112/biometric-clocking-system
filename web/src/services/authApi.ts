import type { AuthenticatedIdentity, UserRole } from '../types/session';
import { getEmployeeRoles, getPortalDemoSnapshot } from './portalDemoRepository';

export interface AuthenticationRequest {
  staffNumber: string;
  password: string;
}

export interface AuthenticationSuccessResponse {
  status: 'authenticated';
  identity: AuthenticatedIdentity;
}

export interface AuthenticationFailureResponse {
  status: 'not_found' | 'invalid_credentials' | 'inactive';
  message: string;
}

export type AuthenticationResponse =
  | AuthenticationSuccessResponse
  | AuthenticationFailureResponse;

const MOCK_DELAY_MS = 500;
const DEMO_PASSWORD = 'demo123';
const ROLE_PRIORITY: readonly UserRole[] = ['admin', 'hr', 'supervisor', 'employee'];

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

export async function authenticate(
  request: AuthenticationRequest,
): Promise<AuthenticationResponse> {
  // TODO(BACKEND-AUTH): replace only this frontend demo boundary with real authentication.
  // The eventual backend must validate credentials and return authoritative role assignments.
  const employeeNumber = request.staffNumber.trim().toUpperCase();
  await wait(MOCK_DELAY_MS);

  if (request.password !== DEMO_PASSWORD) {
    return {
      status: 'invalid_credentials',
      message: 'Use the frontend demo password shown below the login form.',
    };
  }

  const employee = getPortalDemoSnapshot().employees.find(
    (candidate) => candidate.employeeNumber === employeeNumber,
  );
  if (!employee) {
    return {
      status: 'not_found',
      message: 'Employee number was not found. Please check it and try again.',
    };
  }

  if (employee.status !== 'active') {
    return {
      status: 'inactive',
      message: 'This frontend demo account is inactive.',
    };
  }

  const authorizedRoles = getEmployeeRoles(employeeNumber);
  const activeRole = ROLE_PRIORITY.find((role) => authorizedRoles.includes(role));
  if (!activeRole) {
    return {
      status: 'not_found',
      message: 'No active role is assigned to this frontend demo account.',
    };
  }

  return {
    status: 'authenticated',
    identity: { employeeNumber, authorizedRoles, activeRole },
  };
}
