const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const {
  clearAllSessionStorage,
  hydrateSession,
  persistSession,
  SESSION_STORAGE_KEY,
} = require('./.compiled/services/sessionPersistence.js');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key) {
    this.values.delete(key);
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

const validSession = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'employee@example.com',
  firstName: 'Test',
  lastName: 'Employee',
  employeeId: '22222222-2222-2222-2222-222222222222',
  employeeNumber: 'EMP001',
  authorizedRoles: ['employee'],
  activeRole: 'employee',
  accessToken: 'access-token',
  accessTokenExpiresAtUtc: '2030-01-01T00:15:00.000Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAtUtc: '2030-01-08T00:00:00.000Z',
  clockInTime: null,
};

beforeEach(() => {
  globalThis.window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  };
});

test('legacy sessions and partner keys are cleared and signal a redirect to login', () => {
  window.localStorage.setItem('hr-attendance:session:v2', JSON.stringify({ version: 2 }));
  window.localStorage.setItem('hrSession', 'legacy-hr');
  window.sessionStorage.setItem('auth', 'legacy-admin');
  window.sessionStorage.setItem('token', 'legacy-token');
  window.sessionStorage.setItem('currentUser', 'legacy-user');

  const hydrated = hydrateSession();

  assert.equal(hydrated.requiresReauthentication, true);
  assert.equal(hydrated.session.employeeNumber, null);
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
});

test('a malformed current session is cleared and signals reauthentication', () => {
  window.sessionStorage.setItem(`hr-attendance:${SESSION_STORAGE_KEY}`, '{not-json');

  const hydrated = hydrateSession();

  assert.equal(hydrated.requiresReauthentication, true);
  assert.equal(window.sessionStorage.length, 0);
});

test('a valid authenticated identity is persisted and hydrated as session:v4', () => {
  persistSession(validSession, 'local');

  const raw = window.localStorage.getItem(`hr-attendance:${SESSION_STORAGE_KEY}`);
  assert.ok(raw);
  const persisted = JSON.parse(raw);

  assert.equal(persisted.version, 4);
  assert.equal(persisted.userId, validSession.userId);
  assert.equal(persisted.employeeNumber, 'EMP001');
  assert.equal(persisted.accessToken, 'access-token');
  assert.equal('staffNumber' in persisted, false);
  assert.equal(window.sessionStorage.length, 0);

  const hydrated = hydrateSession();
  assert.equal(hydrated.requiresReauthentication, false);
  assert.equal(hydrated.storageKind, 'local');
  assert.equal(hydrated.session.employeeId, validSession.employeeId);
  assert.deepEqual(hydrated.session.authorizedRoles, ['employee']);
});

test('logout cleanup removes current, legacy and partner keys from both stores', () => {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.setItem(`hr-attendance:${SESSION_STORAGE_KEY}`, '{}');
    storage.setItem('hr-attendance:session:v2', '{}');
    storage.setItem('hrSession', 'value');
    storage.setItem('auth', 'value');
    storage.setItem('token', 'value');
    storage.setItem('currentUser', 'value');
  }

  clearAllSessionStorage();

  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
});
