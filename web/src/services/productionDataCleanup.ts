const LEGACY_BROWSER_DATA_KEYS = [
  'hr-attendance:portal-demo:v1',
  'portal-demo:v1',
  'hr-attendance:mock-workforce:v1',
  'hr-attendance:prototype-payroll:v1',
] as const;

export function clearLegacyBrowserData(): void {
  if (typeof window === 'undefined') return;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (const key of LEGACY_BROWSER_DATA_KEYS) {
        storage.removeItem(key);
      }
    } catch {
      // Browser storage cleanup is best-effort and must not block application startup.
    }
  }
}
