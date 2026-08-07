const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getRouteAccessDecision } = require('./.compiled/security/routeAccess.js');

const HOME_BY_ROLE = {
  employee: '/clock',
  supervisor: '/supervisor/dashboard',
  hr: '/hr/dashboard',
  payroll: '/payroll/dashboard',
  executive: '/executive/dashboard',
  admin: '/admin/dashboard',
};

test('the shared guard rejects unauthenticated direct navigation', () => {
  assert.deepEqual(
    getRouteAccessDecision({ userId: null, authorizedRoles: [], activeRole: null }, 'admin'),
    { outcome: 'redirect', to: '/' },
  );
});

test('the shared guard allows each active role into its own route', () => {
  for (const role of Object.keys(HOME_BY_ROLE)) {
    assert.deepEqual(
      getRouteAccessDecision(
        { userId: `${role}-user`, authorizedRoles: [role], activeRole: role },
        role,
      ),
      { outcome: 'allow' },
    );
  }
});

test('the shared guard rejects cross-role direct navigation for every supported role', () => {
  const roles = Object.keys(HOME_BY_ROLE);
  for (const activeRole of roles) {
    for (const requiredRole of roles.filter((role) => role !== activeRole)) {
      assert.deepEqual(
        getRouteAccessDecision(
          {
            userId: `${activeRole}-user`,
            authorizedRoles: roles,
            activeRole,
          },
          requiredRole,
        ),
        { outcome: 'redirect', to: HOME_BY_ROLE[activeRole] },
      );
    }
  }
});