import type { RoleAssignment, TeamAssignment } from '../types/workforce';

const ASSIGNED_AT = '2026-01-01T00:00:00.000Z';

const ROLE_ASSIGNMENTS: readonly RoleAssignment[] = [
  { id: 'role-10001-employee', employeeNumber: '10001', role: 'employee', assignedAt: ASSIGNED_AT, active: true },
  { id: 'role-20001-employee', employeeNumber: '20001', role: 'employee', assignedAt: ASSIGNED_AT, active: true },
  { id: 'role-20001-supervisor', employeeNumber: '20001', role: 'supervisor', assignedAt: ASSIGNED_AT, active: true },
  { id: 'role-30001-employee', employeeNumber: '30001', role: 'employee', assignedAt: ASSIGNED_AT, active: true },
  { id: 'role-30001-hr', employeeNumber: '30001', role: 'hr', assignedAt: ASSIGNED_AT, active: true },
  { id: 'role-40001-admin', employeeNumber: '40001', role: 'admin', assignedAt: ASSIGNED_AT, active: true },
];

const TEAM_MEMBER_EMPLOYEE_NUMBERS = [
  'E10001', 'E10002', 'E10003', 'E10004', 'E10005',
  'E10006', 'E10007', 'E10008', 'E10009', 'E10010',
  'E10011', 'E10012', 'E10013', 'E10014', 'E10015',
  'E10016', 'E10017', 'E10018', 'E10019', 'E10020',
  'E10021', 'E10022', 'E10023', 'E10024', 'E10025',
] as const;

const TEAM_ASSIGNMENTS: readonly TeamAssignment[] = TEAM_MEMBER_EMPLOYEE_NUMBERS.map(
  (memberEmployeeNumber) => ({
    id: `team-20001-${memberEmployeeNumber}`,
    supervisorEmployeeNumber: '20001',
    memberEmployeeNumber,
    assignedAt: ASSIGNED_AT,
    active: true,
  }),
);

export function getRoleAssignments(): readonly RoleAssignment[] {
  return ROLE_ASSIGNMENTS.map((assignment) => ({ ...assignment }));
}

export function getTeamAssignments(): readonly TeamAssignment[] {
  return TEAM_ASSIGNMENTS.map((assignment) => ({ ...assignment }));
}
