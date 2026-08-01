export type StorageKind = 'local' | 'session';

export type StoredItemResult<T> =
  | { status: 'missing' }
  | { status: 'malformed' }
  | { status: 'value'; value: T };

const KEY_PREFIX = 'hr-attendance:';

function getStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getPrefixedKey(key: string) {
  return `${KEY_PREFIX}${key}`;
}

export function getStoredKeys(kind: StorageKind): readonly string[] {
  const storage = getStorage(kind);
  if (!storage) return [];

  try {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => key !== null,
    );
  } catch {
    return [];
  }
}

export function getItem<T>(key: string, kind: StorageKind): T | null {
  const result = inspectItem<T>(key, kind);
  return result.status === 'value' ? result.value : null;
}

export function inspectItem<T>(key: string, kind: StorageKind): StoredItemResult<T> {
  const storage = getStorage(kind);
  if (!storage) return { status: 'missing' };

  const prefixedKey = getPrefixedKey(key);

  try {
    const value = storage.getItem(prefixedKey);
    if (value === null) return { status: 'missing' };
    return { status: 'value', value: JSON.parse(value) as T };
  } catch {
    try {
      storage.removeItem(prefixedKey);
    } catch {
      // Storage can become unavailable between reads; a missing value is the safe fallback.
    }
    return { status: 'malformed' };
  }
}

export function setItem<T>(key: string, value: T, kind: StorageKind): void {
  const storage = getStorage(kind);
  if (!storage) return;

  try {
    storage.setItem(getPrefixedKey(key), JSON.stringify(value));
  } catch {
    // Persistence is best-effort when the browser blocks storage or its quota is exhausted.
  }
}

export function removeItem(key: string, kind: StorageKind): void {
  const storage = getStorage(kind);
  if (!storage) return;

  try {
    storage.removeItem(getPrefixedKey(key));
  } catch {
    // Treat an unavailable storage backend as already cleared.
  }
}

export function hasRawItem(key: string, kind: StorageKind): boolean {
  const storage = getStorage(kind);
  if (!storage) return false;

  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function removeRawItem(key: string, kind: StorageKind): void {
  const storage = getStorage(kind);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Treat an unavailable storage backend as already cleared.
  }
}
