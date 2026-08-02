const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { authenticate } = require('./.compiled/services/authApi.js');
const {
  addPortalEmployee,
  assignPortalRole,
  assignPortalTeamMember,
  getEmployeeRoles,
  getPortalDemoSnapshot,
  resetPortalDemo,
  updatePortalPayrollStatus,
} = require('./.compiled/services/portalDemoRepository.js');
const { getSupervisorTeam } = require('./.compiled/services/teamApi.js');

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  removeItem(key) { this.values.delete(key); }
  setItem(key, value) { this.values.set(key, String(value)); }
}

beforeEach(() => {
  globalThis.window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    setTimeout: globalThis.setTimeout,
  };
  resetPortalDemo();
});

test('all four user types authenticate from the shared frontend repository', async () => {
  const expected = [
    ['10001', 'employee'],
    ['20001', 'supervisor'],
    ['30001', 'hr'],
    ['40001', 'admin'],
  ];
  for (const [employeeNumber, activeRole] of expected) {
    const response = await authenticate({ staffNumber: employeeNumber, password: 'demo123' });
    assert.equal(response.status, 'authenticated');
    if (response.status === 'authenticated') assert.equal(response.identity.activeRole, activeRole);
  }
});

test('Admin-created users and role grants immediately participate in demo authentication', async () => {
  addPortalEmployee({
    employeeNumber: '50001', firstName: 'Test', lastName: 'Officer',
    email: 'test.officer@company.com', phoneNumber: '082 555 5001',
    departmentId: 'dept-hr', jobTitle: 'HR Officer',
    workLocation: 'Johannesburg Office', status: 'active',
  }, '40001');
  assignPortalRole('50001', 'hr', '40001');

  assert.deepEqual(getEmployeeRoles('50001'), ['employee', 'hr']);
  const response = await authenticate({ staffNumber: '50001', password: 'demo123' });
  assert.equal(response.status, 'authenticated');
  if (response.status === 'authenticated') assert.equal(response.identity.activeRole, 'hr');
});

test('Admin team assignments are consumed by the existing Supervisor team service', async () => {
  assignPortalTeamMember('20001', '10001', '40001');
  const team = await getSupervisorTeam({ supervisorStaffNumber: '20001' });
  assert.equal(team.members.some((member) => member.staffNumber === '10001'), true);
});

test('payroll actions persist in the shared frontend repository', () => {
  const record = getPortalDemoSnapshot().payroll.find((candidate) => candidate.status === 'draft');
  assert.ok(record);
  updatePortalPayrollStatus(record.id, 'approved', '30001');
  assert.equal(getPortalDemoSnapshot().payroll.find((candidate) => candidate.id === record.id).status, 'approved');
});
