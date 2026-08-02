import type { UserRole } from './session';

export interface RoleAssignment {
  readonly id: string;
  readonly employeeNumber: string;
  readonly role: UserRole;
  readonly assignedAt: string;
  readonly active: boolean;
}

export interface TeamAssignment {
  readonly id: string;
  readonly supervisorEmployeeNumber: string;
  readonly memberEmployeeNumber: string;
  readonly assignedAt: string;
  readonly active: boolean;
}
