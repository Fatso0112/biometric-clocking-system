"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrefixedKey = getPrefixedKey;
exports.getStoredKeys = getStoredKeys;
exports.getItem = getItem;
exports.inspectItem = inspectItem;
exports.setItem = setItem;
exports.removeItem = removeItem;
exports.hasRawItem = hasRawItem;
exports.removeRawItem = removeRawItem;
const KEY_PREFIX = 'hr-attendance:';
function getStorage(kind) {
    if (typeof window === 'undefined')
        return null;
    try {
        return kind === 'local' ? window.localStorage : window.sessionStorage;
    }
    catch {
        return null;
    }
}
function getPrefixedKey(key) {
    return `${KEY_PREFIX}${key}`;
}
function getStoredKeys(kind) {
    const storage = getStorage(kind);
    if (!storage)
        return [];
    try {
        return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key) => key !== null);
    }
    catch {
        return [];
    }
}
function getItem(key, kind) {
    const result = inspectItem(key, kind);
    return result.status === 'value' ? result.value : null;
}
function inspectItem(key, kind) {
    const storage = getStorage(kind);
    if (!storage)
        return { status: 'missing' };
    const prefixedKey = getPrefixedKey(key);
    try {
        const value = storage.getItem(prefixedKey);
        if (value === null)
            return { status: 'missing' };
        return { status: 'value', value: JSON.parse(value) };
    }
    catch {
        try {
            storage.removeItem(prefixedKey);
        }
        catch {
            // Storage can become unavailable between reads; a missing value is the safe fallback.
        }
        return { status: 'malformed' };
    }
}
function setItem(key, value, kind) {
    const storage = getStorage(kind);
    if (!storage)
        return;
    try {
        storage.setItem(getPrefixedKey(key), JSON.stringify(value));
    }
    catch {
        // Persistence is best-effort when the browser blocks storage or its quota is exhausted.
    }
}
function removeItem(key, kind) {
    const storage = getStorage(kind);
    if (!storage)
        return;
    try {
        storage.removeItem(getPrefixedKey(key));
    }
    catch {
        // Treat an unavailable storage backend as already cleared.
    }
}
function hasRawItem(key, kind) {
    const storage = getStorage(kind);
    if (!storage)
        return false;
    try {
        return storage.getItem(key) !== null;
    }
    catch {
        return false;
    }
}
function removeRawItem(key, kind) {
    const storage = getStorage(kind);
    if (!storage)
        return;
    try {
        storage.removeItem(key);
    }
    catch {
        // Treat an unavailable storage backend as already cleared.
    }
}
