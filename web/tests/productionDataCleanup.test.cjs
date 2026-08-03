const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { clearLegacyBrowserData } = require('./.compiled/services/productionDataCleanup.js');

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  removeItem(key) { this.values.delete(key); }
  setItem(key, value) { this.values.set(key, String(value)); }
}

beforeEach(() => {
  globalThis.window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  };
});

test('legacy browser data is removed without clearing the authenticated session', () => {
  window.localStorage.setItem('hr-attendance:portal-demo:v1', '{"demo":true}');
  window.localStorage.setItem('hr-attendance:session:v4', '{"session":true}');
  window.sessionStorage.setItem('portal-demo:v1', '{"demo":true}');

  clearLegacyBrowserData();

  assert.equal(window.localStorage.getItem('hr-attendance:portal-demo:v1'), null);
  assert.equal(window.sessionStorage.getItem('portal-demo:v1'), null);
  assert.equal(window.localStorage.getItem('hr-attendance:session:v4'), '{"session":true}');
});
