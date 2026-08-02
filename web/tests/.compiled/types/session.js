"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ROLES = void 0;
exports.isUserRole = isUserRole;
exports.USER_ROLES = ['employee', 'supervisor', 'hr', 'admin'];
function isUserRole(value) {
    return typeof value === 'string' && exports.USER_ROLES.some((role) => role === value);
}
