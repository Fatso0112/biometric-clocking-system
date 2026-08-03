import {
  isUserRole,
  type UserRole,
} from '../types/session';
import {
  getPrefixedKey,
  getStoredKeys,
  hasRawItem,
  inspectItem,
  removeRawItem,
  setItem,
  type StorageKind,
} from './persistentStore';

export const SESSION_STORAGE_KEY = 'session:v4';

const PARTNER_SESSION_KEYS = [
  'hrSession',
  'auth',
  'token',
  'currentUser',
] as const;

const STORAGE_KINDS:
  readonly StorageKind[] = [
    'local',
    'session',
  ];

const SESSION_KEY_PREFIX =
  getPrefixedKey('session:');

const CURRENT_PERSISTED_KEY =
  getPrefixedKey(SESSION_STORAGE_KEY);

export interface SessionData {
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;

  employeeId: string | null;
  employeeNumber: string | null;

  authorizedRoles: readonly UserRole[];
  activeRole: UserRole | null;

  accessToken: string | null;
  accessTokenExpiresAtUtc: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAtUtc: string | null;

  clockInTime: Date | null;
}

interface PersistedSessionV4 {
  version: 4;

  userId: string;
  email: string;
  firstName: string;
  lastName: string;

  employeeId: string | null;
  employeeNumber: string | null;

  authorizedRoles: UserRole[];
  activeRole: UserRole;

  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;

  clockInTime: string | null;
}

export interface HydratedSession {
  session: SessionData;
  storageKind: StorageKind | null;
  requiresReauthentication: boolean;
}

export const EMPTY_SESSION: SessionData = {
  userId: null,
  email: null,
  firstName: null,
  lastName: null,

  employeeId: null,
  employeeNumber: null,

  authorizedRoles: [],
  activeRole: null,

  accessToken: null,
  accessTokenExpiresAtUtc: null,
  refreshToken: null,
  refreshTokenExpiresAtUtc: null,

  clockInTime: null,
};

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

function isValidDateString(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return !Number.isNaN(
    new Date(value).getTime(),
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return (
    value === null ||
    typeof value === 'string'
  );
}

function deserializeSession(
  value: unknown,
): SessionData | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const candidate =
    value as Partial<PersistedSessionV4>;

  if (candidate.version !== 4) {
    return null;
  }

  if (!isNonEmptyString(candidate.userId)) {
    return null;
  }

  if (!isNonEmptyString(candidate.email)) {
    return null;
  }

  if (
    !isNonEmptyString(candidate.firstName)
  ) {
    return null;
  }

  if (
    !isNonEmptyString(candidate.lastName)
  ) {
    return null;
  }

  if (
    !isNullableString(candidate.employeeId)
  ) {
    return null;
  }

  if (
    !isNullableString(
      candidate.employeeNumber,
    )
  ) {
    return null;
  }

  if (
    !Array.isArray(
      candidate.authorizedRoles,
    ) ||
    candidate.authorizedRoles.length === 0
  ) {
    return null;
  }

  if (
    !candidate.authorizedRoles.every(
      isUserRole,
    )
  ) {
    return null;
  }

  if (
    new Set(
      candidate.authorizedRoles,
    ).size !==
    candidate.authorizedRoles.length
  ) {
    return null;
  }

  if (!isUserRole(candidate.activeRole)) {
    return null;
  }

  if (
    !candidate.authorizedRoles.includes(
      candidate.activeRole,
    )
  ) {
    return null;
  }

  if (
    !isNonEmptyString(
      candidate.accessToken,
    )
  ) {
    return null;
  }

  if (
    !isValidDateString(
      candidate.accessTokenExpiresAtUtc,
    )
  ) {
    return null;
  }

  if (
    !isNonEmptyString(
      candidate.refreshToken,
    )
  ) {
    return null;
  }

  if (
    !isValidDateString(
      candidate.refreshTokenExpiresAtUtc,
    )
  ) {
    return null;
  }

  if (
    candidate.clockInTime !== null &&
    typeof candidate.clockInTime !==
      'string'
  ) {
    return null;
  }

  const clockInTime =
    candidate.clockInTime === null
      ? null
      : new Date(candidate.clockInTime);

  if (
    clockInTime &&
    Number.isNaN(clockInTime.getTime())
  ) {
    return null;
  }

  return {
    userId: candidate.userId.trim(),
    email:
      candidate.email
        .trim()
        .toLowerCase(),
    firstName:
      candidate.firstName.trim(),
    lastName:
      candidate.lastName.trim(),

    employeeId:
      candidate.employeeId?.trim() ||
      null,

    employeeNumber:
      candidate.employeeNumber?.trim() ||
      null,

    authorizedRoles: [
      ...candidate.authorizedRoles,
    ],

    activeRole: candidate.activeRole,

    accessToken:
      candidate.accessToken,

    accessTokenExpiresAtUtc:
      candidate.accessTokenExpiresAtUtc,

    refreshToken:
      candidate.refreshToken,

    refreshTokenExpiresAtUtc:
      candidate.refreshTokenExpiresAtUtc,

    clockInTime,
  };
}

export function clearAllSessionStorage():
void {
  for (
    const storageKind of STORAGE_KINDS
  ) {
    for (
      const key of
        getStoredKeys(storageKind)
    ) {
      if (
        key.startsWith(
          SESSION_KEY_PREFIX,
        )
      ) {
        removeRawItem(
          key,
          storageKind,
        );
      }
    }

    for (
      const key of PARTNER_SESSION_KEYS
    ) {
      removeRawItem(
        key,
        storageKind,
      );
    }
  }
}

export function hydrateSession():
HydratedSession {
  let invalidPersistedSessionFound =
    false;

  const validSessions: Array<{
    session: SessionData;
    storageKind: StorageKind;
  }> = [];

  for (
    const storageKind of STORAGE_KINDS
  ) {
    for (
      const key of
        getStoredKeys(storageKind)
    ) {
      if (
        key.startsWith(
          SESSION_KEY_PREFIX,
        ) &&
        key !== CURRENT_PERSISTED_KEY
      ) {
        invalidPersistedSessionFound =
          true;

        removeRawItem(
          key,
          storageKind,
        );
      }
    }

    for (
      const key of PARTNER_SESSION_KEYS
    ) {
      if (
        hasRawItem(key, storageKind)
      ) {
        invalidPersistedSessionFound =
          true;
      }

      removeRawItem(
        key,
        storageKind,
      );
    }

    const result =
      inspectItem<unknown>(
        SESSION_STORAGE_KEY,
        storageKind,
      );

    if (result.status === 'missing') {
      continue;
    }

    if (
      result.status === 'malformed'
    ) {
      invalidPersistedSessionFound =
        true;
      continue;
    }

    const session =
      deserializeSession(result.value);

    if (!session) {
      invalidPersistedSessionFound =
        true;
      continue;
    }

    validSessions.push({
      session,
      storageKind,
    });
  }

  if (
    invalidPersistedSessionFound ||
    validSessions.length > 1
  ) {
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
    storageKind:
      hydrated.storageKind,
    requiresReauthentication: false,
  };
}

export function persistSession(
  session: SessionData,
  storageKind: StorageKind,
): void {
  if (
    !session.userId ||
    !session.email ||
    !session.firstName ||
    !session.lastName ||
    !session.activeRole ||
    !session.accessToken ||
    !session.accessTokenExpiresAtUtc ||
    !session.refreshToken ||
    !session.refreshTokenExpiresAtUtc ||
    session.authorizedRoles.length === 0 ||
    !session.authorizedRoles.every(
      isUserRole,
    ) ||
    !session.authorizedRoles.includes(
      session.activeRole,
    )
  ) {
    return;
  }

  const persistedSession:
    PersistedSessionV4 = {
    version: 4,

    userId: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,

    employeeId: session.employeeId,
    employeeNumber:
      session.employeeNumber,

    authorizedRoles: [
      ...session.authorizedRoles,
    ],

    activeRole: session.activeRole,

    accessToken:
      session.accessToken,

    accessTokenExpiresAtUtc:
      session.accessTokenExpiresAtUtc,

    refreshToken:
      session.refreshToken,

    refreshTokenExpiresAtUtc:
      session.refreshTokenExpiresAtUtc,

    clockInTime:
      session.clockInTime
        ?.toISOString() ?? null,
  };

  clearAllSessionStorage();

  setItem(
    SESSION_STORAGE_KEY,
    persistedSession,
    storageKind,
  );
}