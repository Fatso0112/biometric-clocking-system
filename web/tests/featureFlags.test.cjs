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

test('the off-state exposes no Admin or HR navigation entries', () => {
  assert.deepEqual(getPortalNavigationItems('admin', false), []);
  assert.deepEqual(getPortalNavigationItems('hr', false), []);
});

test('only explicit true or 1 values enable portal exposure', () => {
  assert.equal(isEnabledFeatureFlag('true'), true);
  assert.equal(isEnabledFeatureFlag(' TRUE '), true);
  assert.equal(isEnabledFeatureFlag('1'), true);
  assert.equal(isEnabledFeatureFlag('yes'), false);
});
