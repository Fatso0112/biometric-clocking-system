import type { CanonicalAttendance, EmployeeStatus } from './canonicalDomain';
import type { RoleAssignment, TeamAssignment } from './workforce';

export interface PortalEmployee {
  readonly employeeNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly departmentId: string;
  readonly jobTitle: string;
  readonly workLocation: string;
  readonly status: EmployeeStatus;
}

export interface PortalDepartment {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly managerEmployeeNumber: string | null;
}

export interface PortalPayrollRecord {
  readonly id: string;
  readonly employeeNumber: string;
  readonly period: string;
  readonly grossPay: number;
  readonly deductions: number;
  readonly netPay: number;
  readonly status: 'draft' | 'approved' | 'paid';
}

export interface PortalAuditEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly actorEmployeeNumber: string;
  readonly action: string;
  readonly target: string;
  readonly detail: string;
}

export interface PortalSettings {
  readonly organizationName: string;
  readonly timezone: string;
  readonly standardStartTime: string;
  readonly standardEndTime: string;
  readonly lateGraceMinutes: number;
  readonly requireBiometricVerification: boolean;
  readonly emailNotifications: boolean;
}

export interface PortalDemoState {
  readonly version: 1;
  readonly employees: readonly PortalEmployee[];
  readonly departments: readonly PortalDepartment[];
  readonly attendance: readonly CanonicalAttendance[];
  readonly roleAssignments: readonly RoleAssignment[];
  readonly teamAssignments: readonly TeamAssignment[];
  readonly payroll: readonly PortalPayrollRecord[];
  readonly auditEvents: readonly PortalAuditEvent[];
  readonly settings: PortalSettings;
}

export type PortalEmployeeInput = Omit<PortalEmployee, 'status'> & {
  status?: EmployeeStatus;
};
