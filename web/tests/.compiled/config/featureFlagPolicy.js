"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnabledFeatureFlag = isEnabledFeatureFlag;
exports.resolveFeatureFlag = resolveFeatureFlag;
function isEnabledFeatureFlag(value) {
    if (typeof value !== 'string')
        return false;
    return value.trim().toLowerCase() === 'true' || value.trim() === '1';
}
function resolveFeatureFlag(value, defaultValue) {
    return value === undefined ? defaultValue : isEnabledFeatureFlag(value);
}
