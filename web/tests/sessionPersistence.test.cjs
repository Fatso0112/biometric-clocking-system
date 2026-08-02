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

test('malformed session:v3 is cleared and signals a redirect to login', () => {
  window.sessionStorage.setItem(`hr-attendance:${SESSION_STORAGE_KEY}`, '{not-json');

  const hydrated = hydrateSession();

  assert.equal(hydrated.requiresReauthentication, true);
  assert.equal(window.sessionStorage.length, 0);
});

test('a new authenticated identity is persisted as session:v3 only', () => {
  persistSession(
    {
      employeeNumber: '30001',
      authorizedRoles: ['employee', 'hr'],
      activeRole: 'hr',
      clockInTime: null,
    },
    'local',
  );

  const raw = window.localStorage.getItem(`hr-attendance:${SESSION_STORAGE_KEY}`);
  assert.ok(raw);
  const persisted = JSON.parse(raw);

  assert.deepEqual(persisted, {
    version: 3,
    employeeNumber: '30001',
    authorizedRoles: ['employee', 'hr'],
    activeRole: 'hr',
    clockInTime: null,
  });
  assert.equal('staffNumber' in persisted, false);
  assert.equal(window.sessionStorage.length, 0);
});

test('logout cleanup removes current and legacy keys from both storage mechanisms', () => {
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
