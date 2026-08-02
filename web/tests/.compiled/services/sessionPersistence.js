"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_SESSION = exports.SESSION_STORAGE_KEY = void 0;
exports.clearAllSessionStorage = clearAllSessionStorage;
exports.hydrateSession = hydrateSession;
exports.persistSession = persistSession;
const session_1 = require("../types/session");
const persistentStore_1 = require("./persistentStore");
exports.SESSION_STORAGE_KEY = 'session:v4';
const PARTNER_SESSION_KEYS = [
    'hrSession',
    'auth',
    'token',
    'currentUser',
];
const STORAGE_KINDS = [
    'local',
    'session',
];
const SESSION_KEY_PREFIX = (0, persistentStore_1.getPrefixedKey)('session:');
const CURRENT_PERSISTED_KEY = (0, persistentStore_1.getPrefixedKey)(exports.SESSION_STORAGE_KEY);
exports.EMPTY_SESSION = {
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
function isNonEmptyString(value) {
    return (typeof value === 'string' &&
        value.trim().length > 0);
}
function isValidDateString(value) {
    if (typeof value !== 'string') {
        return false;
    }
    return !Number.isNaN(new Date(value).getTime());
}
function isNullableString(value) {
    return (value === null ||
        typeof value === 'string');
}
function deserializeSession(value) {
    if (!value ||
        typeof value !== 'object') {
        return null;
    }
    const candidate = value;
    if (candidate.version !== 4) {
        return null;
    }
    if (!isNonEmptyString(candidate.userId)) {
        return null;
    }
    if (!isNonEmptyString(candidate.email)) {
        return null;
    }
    if (!isNonEmptyString(candidate.firstName)) {
        return null;
    }
    if (!isNonEmptyString(candidate.lastName)) {
        return null;
    }
    if (!isNullableString(candidate.employeeId)) {
        return null;
    }
    if (!isNullableString(candidate.employeeNumber)) {
        return null;
    }
    if (!Array.isArray(candidate.authorizedRoles) ||
        candidate.authorizedRoles.length === 0) {
        return null;
    }
    if (!candidate.authorizedRoles.every(session_1.isUserRole)) {
        return null;
    }
    if (new Set(candidate.authorizedRoles).size !==
        candidate.authorizedRoles.length) {
        return null;
    }
    if (!(0, session_1.isUserRole)(candidate.activeRole)) {
        return null;
    }
    if (!candidate.authorizedRoles.includes(candidate.activeRole)) {
        return null;
    }
    if (!isNonEmptyString(candidate.accessToken)) {
        return null;
    }
    if (!isValidDateString(candidate.accessTokenExpiresAtUtc)) {
        return null;
    }
    if (!isNonEmptyString(candidate.refreshToken)) {
        return null;
    }
    if (!isValidDateString(candidate.refreshTokenExpiresAtUtc)) {
        return null;
    }
    if (candidate.clockInTime !== null &&
        typeof candidate.clockInTime !==
            'string') {
        return null;
    }
    const clockInTime = candidate.clockInTime === null
        ? null
        : new Date(candidate.clockInTime);
    if (clockInTime &&
        Number.isNaN(clockInTime.getTime())) {
        return null;
    }
    return {
        userId: candidate.userId.trim(),
        email: candidate.email
            .trim()
            .toLowerCase(),
        firstName: candidate.firstName.trim(),
        lastName: candidate.lastName.trim(),
        employeeId: candidate.employeeId?.trim() ||
            null,
        employeeNumber: candidate.employeeNumber?.trim() ||
            null,
        authorizedRoles: [
            ...candidate.authorizedRoles,
        ],
        activeRole: candidate.activeRole,
        accessToken: candidate.accessToken,
        accessTokenExpiresAtUtc: candidate.accessTokenExpiresAtUtc,
        refreshToken: candidate.refreshToken,
        refreshTokenExpiresAtUtc: candidate.refreshTokenExpiresAtUtc,
        clockInTime,
    };
}
function clearAllSessionStorage() {
    for (const storageKind of STORAGE_KINDS) {
        for (const key of (0, persistentStore_1.getStoredKeys)(storageKind)) {
            if (key.startsWith(SESSION_KEY_PREFIX)) {
                (0, persistentStore_1.removeRawItem)(key, storageKind);
            }
        }
        for (const key of PARTNER_SESSION_KEYS) {
            (0, persistentStore_1.removeRawItem)(key, storageKind);
        }
    }
}
function hydrateSession() {
    let invalidPersistedSessionFound = false;
    const validSessions = [];
    for (const storageKind of STORAGE_KINDS) {
        for (const key of (0, persistentStore_1.getStoredKeys)(storageKind)) {
            if (key.startsWith(SESSION_KEY_PREFIX) &&
                key !== CURRENT_PERSISTED_KEY) {
                invalidPersistedSessionFound =
                    true;
                (0, persistentStore_1.removeRawItem)(key, storageKind);
            }
        }
        for (const key of PARTNER_SESSION_KEYS) {
            if ((0, persistentStore_1.hasRawItem)(key, storageKind)) {
                invalidPersistedSessionFound =
                    true;
            }
            (0, persistentStore_1.removeRawItem)(key, storageKind);
        }
        const result = (0, persistentStore_1.inspectItem)(exports.SESSION_STORAGE_KEY, storageKind);
        if (result.status === 'missing') {
            continue;
        }
        if (result.status === 'malformed') {
            invalidPersistedSessionFound =
                true;
            continue;
        }
        const session = deserializeSession(result.value);
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
    if (invalidPersistedSessionFound ||
        validSessions.length > 1) {
        clearAllSessionStorage();
        return {
            session: exports.EMPTY_SESSION,
            storageKind: null,
            requiresReauthentication: true,
        };
    }
    const hydrated = validSessions[0];
    if (!hydrated) {
        return {
            session: exports.EMPTY_SESSION,
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
function persistSession(session, storageKind) {
    if (!session.userId ||
        !session.email ||
        !session.firstName ||
        !session.lastName ||
        !session.activeRole ||
        !session.accessToken ||
        !session.accessTokenExpiresAtUtc ||
        !session.refreshToken ||
        !session.refreshTokenExpiresAtUtc ||
        session.authorizedRoles.length === 0 ||
        !session.authorizedRoles.every(session_1.isUserRole) ||
        !session.authorizedRoles.includes(session.activeRole)) {
        return;
    }
    const persistedSession = {
        version: 4,
        userId: session.userId,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        employeeId: session.employeeId,
        employeeNumber: session.employeeNumber,
        authorizedRoles: [
            ...session.authorizedRoles,
        ],
        activeRole: session.activeRole,
        accessToken: session.accessToken,
        accessTokenExpiresAtUtc: session.accessTokenExpiresAtUtc,
        refreshToken: session.refreshToken,
        refreshTokenExpiresAtUtc: session.refreshTokenExpiresAtUtc,
        clockInTime: session.clockInTime
            ?.toISOString() ?? null,
    };
    clearAllSessionStorage();
    (0, persistentStore_1.setItem)(exports.SESSION_STORAGE_KEY, persistedSession, storageKind);
}
