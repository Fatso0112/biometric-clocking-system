import { isUserRole, type UserRole } from '../types/session';
import {
  getPrefixedKey,
  getStoredKeys,
  hasRawItem,
  inspectItem,
  removeRawItem,
  setItem,
  type StorageKind,
} from './persistentStore';

export const SESSION_STORAGE_KEY = 'session:v3';

const PARTNER_SESSION_KEYS = ['hrSession', 'auth', 'token', 'currentUser'] as const;
const STORAGE_KINDS: readonly StorageKind[] = ['local', 'session'];
const SESSION_KEY_PREFIX = getPrefixedKey('session:');
const CURRENT_PERSISTED_KEY = getPrefixedKey(SESSION_STORAGE_KEY);

export interface SessionData {
  employeeNumber: string | null;
  authorizedRoles: readonly UserRole[];
  activeRole: UserRole | null;
  clockInTime: Date | null;
}

interface PersistedSessionV3 {
  version: 3;
  employeeNumber: string;
  authorizedRoles: UserRole[];
  activeRole: UserRole;
  clockInTime: string | null;
}

export interface HydratedSession {
  session: SessionData;
  storageKind: StorageKind | null;
  requiresReauthentication: boolean;
}

export const EMPTY_SESSION: SessionData = {
  employeeNumber: null,
  authorizedRoles: [],
  activeRole: null,
  clockInTime: null,
};

function deserializeSession(value: unknown): SessionData | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<PersistedSessionV3>;
  if (candidate.version !== 3) return null;
  if (typeof candidate.employeeNumber !== 'string' || candidate.employeeNumber.trim() === '') {
    return null;
  }
  if (!Array.isArray(candidate.authorizedRoles) || candidate.authorizedRoles.length === 0) {
    return null;
  }
  if (!candidate.authorizedRoles.every(isUserRole)) return null;
  if (new Set(candidate.authorizedRoles).size !== candidate.authorizedRoles.length) return null;
  if (!isUserRole(candidate.activeRole)) return null;
  if (!candidate.authorizedRoles.includes(candidate.activeRole)) return null;
  if (candidate.clockInTime !== null && typeof candidate.clockInTime !== 'string') return null;

  const clockInTime = candidate.clockInTime === null ? null : new Date(candidate.clockInTime);
  if (clockInTime && Number.isNaN(clockInTime.getTime())) return null;

  return {
    employeeNumber: candidate.employeeNumber.trim(),
    authorizedRoles: [...candidate.authorizedRoles],
    activeRole: candidate.activeRole,
    clockInTime,
  };
}

export function clearAllSessionStorage(): void {
  for (const storageKind of STORAGE_KINDS) {
    for (const key of getStoredKeys(storageKind)) {
      if (key.startsWith(SESSION_KEY_PREFIX)) removeRawItem(key, storageKind);
    }
    for (const key of PARTNER_SESSION_KEYS) removeRawItem(key, storageKind);
  }
}

export function hydrateSession(): HydratedSession {
  let invalidPersistedSessionFound = false;
  const validSessions: Array<{ session: SessionData; storageKind: StorageKind }> = [];

  for (const storageKind of STORAGE_KINDS) {
    for (const key of getStoredKeys(storageKind)) {
      if (key.startsWith(SESSION_KEY_PREFIX) && key !== CURRENT_PERSISTED_KEY) {
        invalidPersistedSessionFound = true;
        removeRawItem(key, storageKind);
      }
    }

    for (const key of PARTNER_SESSION_KEYS) {
      if (hasRawItem(key, storageKind)) invalidPersistedSessionFound = true;
      removeRawItem(key, storageKind);
    }

    const result = inspectItem<unknown>(SESSION_STORAGE_KEY, storageKind);
    if (result.status === 'missing') continue;
    if (result.status === 'malformed') {
      invalidPersistedSessionFound = true;
      continue;
    }

    const session = deserializeSession(result.value);
    if (!session) {
      invalidPersistedSessionFound = true;
      continue;
    }

    validSessions.push({ session, storageKind });
  }

  if (invalidPersistedSessionFound || validSessions.length > 1) {
    clearAllSessionStorage();
    return {
      session: EMPTY_SESSION,
      storageKind: null,
      requiresReauthentication: true,
    };
  }

  const hydrated = validSessions[0];
  if (!hydrated) {
    return {
      session: EMPTY_SESSION,
      storageKind: null,
      requiresReauthentication: false,
    };
  }

  return {
    session: hydrated.session,
    storageKind: hydrated.storageKind,
    requiresReauthentication: false,
  };
}

export function persistSession(session: SessionData, storageKind: StorageKind): void {
  if (
    !session.employeeNumber ||
    !session.activeRole ||
    session.authorizedRoles.length === 0 ||
    !session.authorizedRoles.every(isUserRole) ||
    !session.authorizedRoles.includes(session.activeRole)
  ) {
    return;
  }

  const persistedSession: PersistedSessionV3 = {
    version: 3,
    employeeNumber: session.employeeNumber,
    authorizedRoles: [...session.authorizedRoles],
    activeRole: session.activeRole,
    clockInTime: session.clockInTime?.toISOString() ?? null,
  };

  clearAllSessionStorage();
  setItem(SESSION_STORAGE_KEY, persistedSession, storageKind);
}
