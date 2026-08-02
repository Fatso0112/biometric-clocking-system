"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortalDemoSnapshot = getPortalDemoSnapshot;
exports.subscribeToPortalDemo = subscribeToPortalDemo;
exports.getEmployeeRoles = getEmployeeRoles;
exports.addPortalEmployee = addPortalEmployee;
exports.updatePortalEmployee = updatePortalEmployee;
exports.setPortalEmployeeStatus = setPortalEmployeeStatus;
exports.addPortalDepartment = addPortalDepartment;
exports.assignPortalRole = assignPortalRole;
exports.revokePortalRole = revokePortalRole;
exports.assignPortalTeamMember = assignPortalTeamMember;
exports.updatePortalPayrollStatus = updatePortalPayrollStatus;
exports.updatePortalSettings = updatePortalSettings;
exports.resetPortalDemo = resetPortalDemo;
const persistentStore_1 = require("./persistentStore");
const mockWorkforce_1 = require("./mockWorkforce");
const STORE_KEY = 'portal-demo:v1';
const SEED_TIMESTAMP = '2026-08-01T08:00:00.000Z';
let generatedId = 0;
const DEPARTMENTS = [
    { id: 'dept-operations', code: 'OPS', name: 'Operations', managerEmployeeNumber: '20001' },
    { id: 'dept-hr', code: 'HR', name: 'Human Resources', managerEmployeeNumber: '30001' },
    { id: 'dept-finance', code: 'FIN', name: 'Finance', managerEmployeeNumber: null },
    { id: 'dept-sales', code: 'SAL', name: 'Sales', managerEmployeeNumber: null },
    { id: 'dept-engineering', code: 'ENG', name: 'Engineering', managerEmployeeNumber: null },
    { id: 'dept-logistics', code: 'LOG', name: 'Logistics', managerEmployeeNumber: null },
];
const TEAM_EMPLOYEES = [
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
const PRIMARY_EMPLOYEES = [
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
function isoDate(daysAgo) {
    const date = new Date('2026-08-01T00:00:00.000Z');
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return date.toISOString().slice(0, 10);
}
function createAttendanceSeed() {
    return ALL_EMPLOYEES.slice(0, 18).flatMap((employee, employeeIndex) => [0, 1, 2, 3, 4].map((daysAgo) => {
        const absent = (employeeIndex + daysAgo) % 11 === 0;
        const late = !absent && (employeeIndex + daysAgo) % 5 === 0;
        const incomplete = !absent && !late && (employeeIndex + daysAgo) % 13 === 0;
        const clockInHour = late ? 9 : 8;
        const workDate = isoDate(daysAgo);
        const clockIn = absent ? null : `${workDate}T${String(clockInHour).padStart(2, '0')}:${String((employeeIndex * 7) % 45).padStart(2, '0')}:00.000Z`;
        const clockOut = absent || incomplete ? null : `${workDate}T17:${String((employeeIndex * 3) % 40).padStart(2, '0')}:00.000Z`;
        const durationMinutes = clockIn && clockOut
            ? Math.max(0, Math.round((Date.parse(clockOut) - Date.parse(clockIn)) / 60000))
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
        };
    }));
}
function createPayrollSeed() {
    return ALL_EMPLOYEES.slice(0, 14).map((employee, index) => {
        const grossPay = 18000 + index * 1350;
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
function createSeedState() {
    const teamEmployeeRoles = TEAM_EMPLOYEES.map((employee) => ({
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
        roleAssignments: [...(0, mockWorkforce_1.getRoleAssignments)(), ...teamEmployeeRoles],
        teamAssignments: (0, mockWorkforce_1.getTeamAssignments)(),
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
function isPersistedState(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return (candidate.version === 1 &&
        Array.isArray(candidate.employees) &&
        Array.isArray(candidate.departments) &&
        Array.isArray(candidate.attendance) &&
        Array.isArray(candidate.roleAssignments) &&
        Array.isArray(candidate.teamAssignments) &&
        Array.isArray(candidate.payroll) &&
        Array.isArray(candidate.auditEvents) &&
        Boolean(candidate.settings));
}
let snapshot = null;
const listeners = new Set();
function createId(prefix) {
    generatedId += 1;
    return `${prefix}-${Date.now()}-${generatedId}`;
}
function loadSnapshot() {
    const persisted = (0, persistentStore_1.getItem)(STORE_KEY, 'local');
    return isPersistedState(persisted) ? persisted : createSeedState();
}
function getPortalDemoSnapshot() {
    snapshot ?? (snapshot = loadSnapshot());
    return snapshot;
}
function subscribeToPortalDemo(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
function commit(nextState) {
    snapshot = nextState;
    (0, persistentStore_1.setItem)(STORE_KEY, nextState, 'local');
    for (const listener of listeners)
        listener();
}
function recordAudit(state, actorEmployeeNumber, action, target, detail) {
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
function getEmployeeRoles(employeeNumber) {
    return getPortalDemoSnapshot().roleAssignments
        .filter((assignment) => assignment.employeeNumber === employeeNumber && assignment.active)
        .map((assignment) => assignment.role);
}
function addPortalEmployee(input, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    if (state.employees.some((employee) => employee.employeeNumber === input.employeeNumber)) {
        throw new Error('An employee with this employee number already exists.');
    }
    const employee = { ...input, status: input.status ?? 'active' };
    const roleAssignment = {
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
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Employee created', employee.employeeNumber, `${employee.firstName} ${employee.lastName} was added to the frontend demo repository.`),
    });
}
function updatePortalEmployee(employeeNumber, changes, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    if (!state.employees.some((employee) => employee.employeeNumber === employeeNumber)) {
        throw new Error('Employee not found.');
    }
    commit({
        ...state,
        employees: state.employees.map((employee) => employee.employeeNumber === employeeNumber ? { ...employee, ...changes } : employee),
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Employee updated', employeeNumber, 'Employee profile fields were updated in the frontend demo repository.'),
    });
}
function setPortalEmployeeStatus(employeeNumber, status, actorEmployeeNumber) {
    updatePortalEmployee(employeeNumber, { status }, actorEmployeeNumber);
}
function addPortalDepartment(department, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    const normalizedCode = department.code.trim().toUpperCase();
    if (state.departments.some((candidate) => candidate.code === normalizedCode)) {
        throw new Error('A department with this code already exists.');
    }
    const created = { ...department, id: createId('department'), code: normalizedCode };
    commit({
        ...state,
        departments: [...state.departments, created],
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Department created', created.code, `${created.name} was added to the frontend demo repository.`),
    });
}
function assignPortalRole(employeeNumber, role, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    const existing = state.roleAssignments.find((assignment) => assignment.employeeNumber === employeeNumber && assignment.role === role);
    const nextAssignments = existing
        ? state.roleAssignments.map((assignment) => assignment.id === existing.id ? { ...assignment, active: true } : assignment)
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
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Role granted', employeeNumber, `Granted the ${role} role in the frontend demo repository.`),
    });
}
function revokePortalRole(employeeNumber, role, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    commit({
        ...state,
        roleAssignments: state.roleAssignments.map((assignment) => assignment.employeeNumber === employeeNumber && assignment.role === role
            ? { ...assignment, active: false }
            : assignment),
        teamAssignments: role === 'supervisor'
            ? state.teamAssignments.map((assignment) => assignment.supervisorEmployeeNumber === employeeNumber
                ? { ...assignment, active: false }
                : assignment)
            : state.teamAssignments,
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Role revoked', employeeNumber, `Revoked the ${role} role in the frontend demo repository.`),
    });
}
function assignPortalTeamMember(supervisorEmployeeNumber, memberEmployeeNumber, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    const existing = state.teamAssignments.find((assignment) => assignment.memberEmployeeNumber === memberEmployeeNumber);
    const nextAssignments = existing
        ? state.teamAssignments.map((assignment) => assignment.id === existing.id
            ? { ...assignment, supervisorEmployeeNumber, active: true }
            : assignment)
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
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Team assignment changed', memberEmployeeNumber, `Assigned employee to supervisor ${supervisorEmployeeNumber}.`),
    });
}
function updatePortalPayrollStatus(payrollId, status, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    commit({
        ...state,
        payroll: state.payroll.map((record) => record.id === payrollId ? { ...record, status } : record),
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Payroll status updated', payrollId, `Payroll status changed to ${status}.`),
    });
}
function updatePortalSettings(settings, actorEmployeeNumber) {
    const state = getPortalDemoSnapshot();
    commit({
        ...state,
        settings,
        auditEvents: recordAudit(state, actorEmployeeNumber, 'Settings updated', 'Organization settings', 'Frontend demo organization settings were updated.'),
    });
}
function resetPortalDemo() {
    (0, persistentStore_1.removeItem)(STORE_KEY, 'local');
    snapshot = createSeedState();
    for (const listener of listeners)
        listener();
}
