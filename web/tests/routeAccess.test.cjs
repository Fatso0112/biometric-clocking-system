const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getRouteAccessDecision } = require('./.compiled/security/routeAccess.js');

const HOME_BY_ROLE = {
  employee: '/clock',
  supervisor: '/supervisor/dashboard',
  hr: '/hr/dashboard',
  admin: '/admin/dashboard',
};

test('the shared guard rejects unauthenticated direct navigation', () => {
  assert.deepEqual(
    getRouteAccessDecision({ employeeNumber: null, authorizedRoles: [], activeRole: null }, 'admin'),
    { outcome: 'redirect', to: '/' },
  );
});

test('the shared guard allows each active role into its own route', () => {
  for (const role of Object.keys(HOME_BY_ROLE)) {
    assert.deepEqual(
      getRouteAccessDecision(
        { employeeNumber: `${role}-1`, authorizedRoles: [role], activeRole: role },
        role,
      ),
      { outcome: 'allow' },
    );
  }
});

test('the shared guard rejects cross-role direct navigation for all four roles', () => {
  const roles = Object.keys(HOME_BY_ROLE);
  for (const activeRole of roles) {
    for (const requiredRole of roles.filter((role) => role !== activeRole)) {
      assert.deepEqual(
        getRouteAccessDecision(
          {
            employeeNumber: `${activeRole}-1`,
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
