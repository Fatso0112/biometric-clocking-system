"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_SESSION = exports.SESSION_STORAGE_KEY = void 0;
exports.clearAllSessionStorage = clearAllSessionStorage;
exports.hydrateSession = hydrateSession;
exports.persistSession = persistSession;
const session_1 = require("../types/session");
const persistentStore_1 = require("./persistentStore");
exports.SESSION_STORAGE_KEY = 'session:v3';
const PARTNER_SESSION_KEYS = ['hrSession', 'auth', 'token', 'currentUser'];
const STORAGE_KINDS = ['local', 'session'];
const SESSION_KEY_PREFIX = (0, persistentStore_1.getPrefixedKey)('session:');
const CURRENT_PERSISTED_KEY = (0, persistentStore_1.getPrefixedKey)(exports.SESSION_STORAGE_KEY);
exports.EMPTY_SESSION = {
    employeeNumber: null,
    authorizedRoles: [],
    activeRole: null,
    clockInTime: null,
};
function deserializeSession(value) {
    if (!value || typeof value !== 'object')
        return null;
    const candidate = value;
    if (candidate.version !== 3)
        return null;
    if (typeof candidate.employeeNumber !== 'string' || candidate.employeeNumber.trim() === '') {
        return null;
    }
    if (!Array.isArray(candidate.authorizedRoles) || candidate.authorizedRoles.length === 0) {
        return null;
    }
    if (!candidate.authorizedRoles.every(session_1.isUserRole))
        return null;
    if (new Set(candidate.authorizedRoles).size !== candidate.authorizedRoles.length)
        return null;
    if (!(0, session_1.isUserRole)(candidate.activeRole))
        return null;
    if (!candidate.authorizedRoles.includes(candidate.activeRole))
        return null;
    if (candidate.clockInTime !== null && typeof candidate.clockInTime !== 'string')
        return null;
    const clockInTime = candidate.clockInTime === null ? null : new Date(candidate.clockInTime);
    if (clockInTime && Number.isNaN(clockInTime.getTime()))
        return null;
    return {
        employeeNumber: candidate.employeeNumber.trim(),
        authorizedRoles: [...candidate.authorizedRoles],
        activeRole: candidate.activeRole,
        clockInTime,
    };
}
function clearAllSessionStorage() {
    for (const storageKind of STORAGE_KINDS) {
        for (const key of (0, persistentStore_1.getStoredKeys)(storageKind)) {
            if (key.startsWith(SESSION_KEY_PREFIX))
                (0, persistentStore_1.removeRawItem)(key, storageKind);
        }
        for (const key of PARTNER_SESSION_KEYS)
            (0, persistentStore_1.removeRawItem)(key, storageKind);
    }
}
function hydrateSession() {
    let invalidPersistedSessionFound = false;
    const validSessions = [];
    for (const storageKind of STORAGE_KINDS) {
        for (const key of (0, persistentStore_1.getStoredKeys)(storageKind)) {
            if (key.startsWith(SESSION_KEY_PREFIX) && key !== CURRENT_PERSISTED_KEY) {
                invalidPersistedSessionFound = true;
                (0, persistentStore_1.removeRawItem)(key, storageKind);
            }
        }
        for (const key of PARTNER_SESSION_KEYS) {
            if ((0, persistentStore_1.hasRawItem)(key, storageKind))
                invalidPersistedSessionFound = true;
            (0, persistentStore_1.removeRawItem)(key, storageKind);
        }
        const result = (0, persistentStore_1.inspectItem)(exports.SESSION_STORAGE_KEY, storageKind);
        if (result.status === 'missing')
            continue;
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
    if (!session.employeeNumber ||
        !session.activeRole ||
        session.authorizedRoles.length === 0 ||
        !session.authorizedRoles.every(session_1.isUserRole) ||
        !session.authorizedRoles.includes(session.activeRole)) {
        return;
    }
    const persistedSession = {
        version: 3,
        employeeNumber: session.employeeNumber,
        authorizedRoles: [...session.authorizedRoles],
        activeRole: session.activeRole,
        clockInTime: session.clockInTime?.toISOString() ?? null,
    };
    clearAllSessionStorage();
    (0, persistentStore_1.setItem)(exports.SESSION_STORAGE_KEY, persistedSession, storageKind);
}
