import { getItem, removeItem, setItem } from './persistentStore';
import { getRoleAssignments, getTeamAssignments } from './mockWorkforce';
import type { CanonicalAttendance, EmployeeStatus } from '../types/canonicalDomain';
import type {
  PortalAuditEvent,
  PortalDemoState,
  PortalDepartment,
  PortalEmployee,
  PortalEmployeeInput,
  PortalPayrollRecord,
  PortalSettings,
} from '../types/portalDemo';
import type { UserRole } from '../types/session';
import type { RoleAssignment, TeamAssignment } from '../types/workforce';

const STORE_KEY = 'portal-demo:v1';
const SEED_TIMESTAMP = '2026-08-01T08:00:00.000Z';
let generatedId = 0;

const DEPARTMENTS: readonly PortalDepartment[] = [
  { id: 'dept-operations', code: 'OPS', name: 'Operations', managerEmployeeNumber: '20001' },
  { id: 'dept-hr', code: 'HR', name: 'Human Resources', managerEmployeeNumber: '30001' },
  { id: 'dept-finance', code: 'FIN', name: 'Finance', managerEmployeeNumber: null },
  { id: 'dept-sales', code: 'SAL', name: 'Sales', managerEmployeeNumber: null },
  { id: 'dept-engineering', code: 'ENG', name: 'Engineering', managerEmployeeNumber: null },
  { id: 'dept-logistics', code: 'LOG', name: 'Logistics', managerEmployeeNumber: null },
];

const TEAM_EMPLOYEES: readonly PortalEmployee[] = [
  ['E10001', 'John', 'Smith', 'Operations Coordinator'],
  ['E10002', 'David', 'Miller', 'Operations Assistant'],
  ['E10003', 'Linda', 'Davis', 'Inventory Controller'],
  ['E10004', 'James', 'Wilson', 'Dispatch Coordinator'],
  ['E10005', 'Patricia', 'Moore', 'Operations Assistant'],
  ['E10006', 'Robert', 'Taylor', 'Warehouse Associate'],
  ['E10007', 'Jennifer', 'Anderson', 'Quality Controller'],
  ['E10008', 'Michael', 'Thomas', 'Logistics Coordinator'],
  ['E10009', 'Barbara', 'Jackson', 'Warehouse Associate'],
  ['E10010', 'William', 'White', 'Inventory Clerk'],
  ['E10011', 'Elizabeth', 'Harris', 'Operations Assistant'],
  ['E10012', 'Richard', 'Martin', 'Dispatch Assistant'],
  ['E10013', 'Susan', 'Thompson', 'Quality Controller'],
  ['E10014', 'Joseph', 'Garcia', 'Warehouse Associate'],
  ['E10015', 'Jessica', 'Martinez', 'Inventory Clerk'],
  ['E10016', 'Thomas', 'Robinson', 'Logistics Assistant'],
  ['E10017', 'Sarah', 'Clark', 'Operations Assistant'],
  ['E10018', 'Charles', 'Rodriguez', 'Dispatch Assistant'],
  ['E10019', 'Karen', 'Lewis', 'Warehouse Associate'],
  ['E10020', 'Christopher', 'Lee', 'Inventory Controller'],
  ['E10021', 'Nancy', 'Walker', 'Quality Assistant'],
  ['E10022', 'Daniel', 'Hall', 'Warehouse Associate'],
  ['E10023', 'Lisa', 'Allen', 'Operations Assistant'],
  ['E10024', 'Matthew', 'Young', 'Dispatch Assistant'],
  ['E10025', 'Betty', 'Hernandez', 'Logistics Assistant'],
].map(([employeeNumber, firstName, lastName, jobTitle], index) => ({
  employeeNumber,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
  phoneNumber: `082 555 ${String(1100 + index).padStart(4, '0')}`,
  departmentId: index % 4 === 0 ? 'dept-logistics' : 'dept-operations',
  jobTitle,
  workLocation: 'Johannesburg Office',
  status: index === 18 ? 'inactive' : 'active',
}));

const PRIMARY_EMPLOYEES: readonly PortalEmployee[] = [
  {
    employeeNumber: '10001', firstName: 'Alex', lastName: 'Johnson',
    email: 'alex.johnson@company.com', phoneNumber: '082 123 4567',
    departmentId: 'dept-sales', jobTitle: 'Sales Assistant',
    workLocation: 'Johannesburg Office', status: 'active',
  },
  {
    employeeNumber: '20001', firstName: 'Sarah', lastName: 'Johnson',
    email: 'sarah.johnson@company.com', phoneNumber: '082 555 0101',
    departmentId: 'dept-operations', jobTitle: 'Operations Supervisor',
    workLocation: 'Johannesburg Office', status: 'active',
  },
  {
    employeeNumber: '30001', firstName: 'Naledi', lastName: 'Mokoena',
    email: 'naledi.mokoena@company.com', phoneNumber: '082 555 0201',
    departmentId: 'dept-hr', jobTitle: 'HR Officer',
    workLocation: 'Johannesburg Office', status: 'active',
  },
  {
    employeeNumber: '40001', firstName: 'Jordan', lastName: 'Williams',
    email: 'jordan.williams@company.com', phoneNumber: '082 555 0301',
    departmentId: 'dept-hr', jobTitle: 'System Administrator',
    workLocation: 'Johannesburg Office', status: 'active',
  },
];

const ALL_EMPLOYEES = [...PRIMARY_EMPLOYEES, ...TEAM_EMPLOYEES];

function isoDate(daysAgo: number): string {
  const date = new Date('2026-08-01T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function createAttendanceSeed(): readonly CanonicalAttendance[] {
  return ALL_EMPLOYEES.slice(0, 18).flatMap((employee, employeeIndex) =>
    [0, 1, 2, 3, 4].map((daysAgo) => {
      const absent = (employeeIndex + daysAgo) % 11 === 0;
      const late = !absent && (employeeIndex + daysAgo) % 5 === 0;
      const incomplete = !absent && !late && (employeeIndex + daysAgo) % 13 === 0;
      const clockInHour = late ? 9 : 8;
      const workDate = isoDate(daysAgo);
      const clockIn = absent ? null : `${workDate}T${String(clockInHour).padStart(2, '0')}:${String((employeeIndex * 7) % 45).padStart(2, '0')}:00.000Z`;
      const clockOut = absent || incomplete ? null : `${workDate}T17:${String((employeeIndex * 3) % 40).padStart(2, '0')}:00.000Z`;
      const durationMinutes = clockIn && clockOut
        ? Math.max(0, Math.round((Date.parse(clockOut) - Date.parse(clockIn)) / 60_000))
        : null;

      return {
        id: `attendance-${employee.employeeNumber}-${workDate}`,
        employeeId: employee.employeeNumber,
        employeeNumber: employee.employeeNumber,
        workDate,
        clockIn,
        clockOut,
        status: absent ? 'absent' : incomplete ? 'incomplete' : late ? 'late' : 'present',
        durationMinutes,
        source: absent ? 'manual' : 'biometric',
        verificationResult: absent ? 'not-required' : incomplete ? 'failed' : 'verified',
      } satisfies CanonicalAttendance;
    }),
  );
}

function createPayrollSeed(): readonly PortalPayrollRecord[] {
  return ALL_EMPLOYEES.slice(0, 14).map((employee, index) => {
    const grossPay = 18_000 + index * 1_350;
    const deductions = Math.round(grossPay * 0.14);
    return {
      id: `payroll-2026-07-${employee.employeeNumber}`,
      employeeNumber: employee.employeeNumber,
      period: '2026-07',
      grossPay,
      deductions,
      netPay: grossPay - deductions,
      status: index < 5 ? 'paid' : index < 10 ? 'approved' : 'draft',
    };
  });
}

function createSeedState(): PortalDemoState {
  const teamEmployeeRoles: RoleAssignment[] = TEAM_EMPLOYEES.map((employee) => ({
    id: `role-${employee.employeeNumber}-employee`,
    employeeNumber: employee.employeeNumber,
    role: 'employee',
    assignedAt: SEED_TIMESTAMP,
    active: true,
  }));

  return {
    version: 1,
    employees: ALL_EMPLOYEES,
    departments: DEPARTMENTS,
    attendance: createAttendanceSeed(),
    roleAssignments: [...getRoleAssignments(), ...teamEmployeeRoles],
    teamAssignments: getTeamAssignments(),
    payroll: createPayrollSeed(),
    auditEvents: [
      {
        id: 'audit-seed-1', occurredAt: SEED_TIMESTAMP, actorEmployeeNumber: '40001',
        action: 'Demo workspace initialized', target: 'Frontend mock repository',
        detail: 'Created the shared Admin, HR, and Supervisor demo state.',
      },
    ],
    settings: {
      organizationName: 'HR Attendance Management',
      timezone: 'Africa/Johannesburg',
      standardStartTime: '08:00',
      standardEndTime: '17:00',
      lateGraceMinutes: 10,
      requireBiometricVerification: true,
      emailNotifications: true,
    },
  };
}

function isPersistedState(value: unknown): value is PortalDemoState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PortalDemoState>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.employees) &&
    Array.isArray(candidate.departments) &&
    Array.isArray(candidate.attendance) &&
    Array.isArray(candidate.roleAssignments) &&
    Array.isArray(candidate.teamAssignments) &&
    Array.isArray(candidate.payroll) &&
    Array.isArray(candidate.auditEvents) &&
    Boolean(candidate.settings)
  );
}

let snapshot: PortalDemoState | null = null;
const listeners = new Set<() => void>();

function createId(prefix: string): string {
  generatedId += 1;
  return `${prefix}-${Date.now()}-${generatedId}`;
}

function loadSnapshot(): PortalDemoState {
  const persisted = getItem<unknown>(STORE_KEY, 'local');
  return isPersistedState(persisted) ? persisted : createSeedState();
}

export function getPortalDemoSnapshot(): PortalDemoState {
  snapshot ??= loadSnapshot();
  return snapshot;
}

export function subscribeToPortalDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(nextState: PortalDemoState): void {
  snapshot = nextState;
  setItem(STORE_KEY, nextState, 'local');
  for (const listener of listeners) listener();
}

function recordAudit(
  state: PortalDemoState,
  actorEmployeeNumber: string,
  action: string,
  target: string,
  detail: string,
): readonly PortalAuditEvent[] {
  return [
    {
      id: createId('audit'),
      occurredAt: new Date().toISOString(),
      actorEmployeeNumber,
      action,
      target,
      detail,
    },
    ...state.auditEvents,
  ];
}

export function getEmployeeRoles(employeeNumber: string): readonly UserRole[] {
  return getPortalDemoSnapshot().roleAssignments
    .filter((assignment) => assignment.employeeNumber === employeeNumber && assignment.active)
    .map((assignment) => assignment.role);
}

export function addPortalEmployee(input: PortalEmployeeInput, actorEmployeeNumber: string): void {
  const state = getPortalDemoSnapshot();
  if (state.employees.some((employee) => employee.employeeNumber === input.employeeNumber)) {
    throw new Error('An employee with this employee number already exists.');
  }

  const employee: PortalEmployee = { ...input, status: input.status ?? 'active' };
  const roleAssignment: RoleAssignment = {
    id: createId('role'),
    employeeNumber: employee.employeeNumber,
    role: 'employee',
    assignedAt: new Date().toISOString(),
    active: true,
  };

  commit({
    ...state,
    employees: [...state.employees, employee],
    roleAssignments: [...state.roleAssignments, roleAssignment],
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Employee created',
      employee.employeeNumber,
      `${employee.firstName} ${employee.lastName} was added to the frontend demo repository.`,
    ),
  });
}

export function updatePortalEmployee(
  employeeNumber: string,
  changes: Partial<Omit<PortalEmployee, 'employeeNumber'>>,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  if (!state.employees.some((employee) => employee.employeeNumber === employeeNumber)) {
    throw new Error('Employee not found.');
  }
  commit({
    ...state,
    employees: state.employees.map((employee) =>
      employee.employeeNumber === employeeNumber ? { ...employee, ...changes } : employee,
    ),
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Employee updated',
      employeeNumber,
      'Employee profile fields were updated in the frontend demo repository.',
    ),
  });
}

export function setPortalEmployeeStatus(
  employeeNumber: string,
  status: EmployeeStatus,
  actorEmployeeNumber: string,
): void {
  updatePortalEmployee(employeeNumber, { status }, actorEmployeeNumber);
}

export function addPortalDepartment(
  department: Omit<PortalDepartment, 'id'>,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  const normalizedCode = department.code.trim().toUpperCase();
  if (state.departments.some((candidate) => candidate.code === normalizedCode)) {
    throw new Error('A department with this code already exists.');
  }
  const created = { ...department, id: createId('department'), code: normalizedCode };
  commit({
    ...state,
    departments: [...state.departments, created],
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Department created',
      created.code,
      `${created.name} was added to the frontend demo repository.`,
    ),
  });
}

export function assignPortalRole(
  employeeNumber: string,
  role: UserRole,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  const existing = state.roleAssignments.find(
    (assignment) => assignment.employeeNumber === employeeNumber && assignment.role === role,
  );
  const nextAssignments = existing
    ? state.roleAssignments.map((assignment) =>
        assignment.id === existing.id ? { ...assignment, active: true } : assignment,
      )
    : [
        ...state.roleAssignments,
        {
          id: createId('role'), employeeNumber, role,
          assignedAt: new Date().toISOString(), active: true,
        },
      ];
  commit({
    ...state,
    roleAssignments: nextAssignments,
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Role granted',
      employeeNumber,
      `Granted the ${role} role in the frontend demo repository.`,
    ),
  });
}

export function revokePortalRole(
  employeeNumber: string,
  role: Exclude<UserRole, 'employee'>,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  commit({
    ...state,
    roleAssignments: state.roleAssignments.map((assignment) =>
      assignment.employeeNumber === employeeNumber && assignment.role === role
        ? { ...assignment, active: false }
        : assignment,
    ),
    teamAssignments: role === 'supervisor'
      ? state.teamAssignments.map((assignment) =>
          assignment.supervisorEmployeeNumber === employeeNumber
            ? { ...assignment, active: false }
            : assignment,
        )
      : state.teamAssignments,
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Role revoked',
      employeeNumber,
      `Revoked the ${role} role in the frontend demo repository.`,
    ),
  });
}

export function assignPortalTeamMember(
  supervisorEmployeeNumber: string,
  memberEmployeeNumber: string,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  const existing = state.teamAssignments.find(
    (assignment) => assignment.memberEmployeeNumber === memberEmployeeNumber,
  );
  const nextAssignments: readonly TeamAssignment[] = existing
    ? state.teamAssignments.map((assignment) =>
        assignment.id === existing.id
          ? { ...assignment, supervisorEmployeeNumber, active: true }
          : assignment,
      )
    : [
        ...state.teamAssignments,
        {
          id: createId('team'), supervisorEmployeeNumber, memberEmployeeNumber,
          assignedAt: new Date().toISOString(), active: true,
        },
      ];
  commit({
    ...state,
    teamAssignments: nextAssignments,
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Team assignment changed',
      memberEmployeeNumber,
      `Assigned employee to supervisor ${supervisorEmployeeNumber}.`,
    ),
  });
}

export function updatePortalPayrollStatus(
  payrollId: string,
  status: PortalPayrollRecord['status'],
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  commit({
    ...state,
    payroll: state.payroll.map((record) => record.id === payrollId ? { ...record, status } : record),
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Payroll status updated',
      payrollId,
      `Payroll status changed to ${status}.`,
    ),
  });
}

export function updatePortalSettings(
  settings: PortalSettings,
  actorEmployeeNumber: string,
): void {
  const state = getPortalDemoSnapshot();
  commit({
    ...state,
    settings,
    auditEvents: recordAudit(
      state,
      actorEmployeeNumber,
      'Settings updated',
      'Organization settings',
      'Frontend demo organization settings were updated.',
    ),
  });
}

export function resetPortalDemo(): void {
  removeItem(STORE_KEY, 'local');
  snapshot = createSeedState();
  for (const listener of listeners) listener();
}
