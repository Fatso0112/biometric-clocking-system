export function isEnabledFeatureFlag(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'true' || value.trim() === '1';
}

export function resolveFeatureFlag(value: unknown, defaultValue: boolean): boolean {
  return value === undefined ? defaultValue : isEnabledFeatureFlag(value);
}
