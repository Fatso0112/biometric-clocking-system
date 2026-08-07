const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isEnabledFeatureFlag, resolveFeatureFlag } = require('./.compiled/config/featureFlagPolicy.js');
const { getPortalNavigationItems } = require('./.compiled/navigation/portalNavigation.js');

test('feature flag parsing rejects absent and false values', () => {
  assert.equal(isEnabledFeatureFlag(undefined), false);
  assert.equal(isEnabledFeatureFlag(''), false);
  assert.equal(isEnabledFeatureFlag('false'), false);
});

test('the completed portal integration defaults on but keeps an explicit kill switch', () => {
  assert.equal(resolveFeatureFlag(undefined, true), true);
  assert.equal(resolveFeatureFlag('false', true), false);
});

test('the off-state exposes no management portal navigation entries', () => {
  for (const role of ['admin', 'hr', 'payroll', 'executive']) {
    assert.deepEqual(getPortalNavigationItems(role, false), []);
  }
});

test('only explicit true or 1 values enable portal exposure', () => {
  assert.equal(isEnabledFeatureFlag('true'), true);
  assert.equal(isEnabledFeatureFlag(' TRUE '), true);
  assert.equal(isEnabledFeatureFlag('1'), true);
  assert.equal(isEnabledFeatureFlag('yes'), false);
});

test('production navigation exposes database-backed payroll pages and excludes placeholders', () => {
  const paths = [
    ...getPortalNavigationItems('admin', true),
    ...getPortalNavigationItems('hr', true),
    ...getPortalNavigationItems('payroll', true),
    ...getPortalNavigationItems('executive', true),
  ].map((item) => item.path);

  assert.equal(paths.some((path) => path.includes('payroll')), true);
  assert.equal(paths.some((path) => path.includes('settings')), false);
  assert.equal(paths.some((path) => path.includes('audit')), false);
});