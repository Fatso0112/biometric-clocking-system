"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteAccessDecision = getRouteAccessDecision;
const navigation_1 = require("../types/navigation");
function getRouteAccessDecision(session, requiredRole) {
    const { employeeNumber, authorizedRoles, activeRole } = session;
    if (!employeeNumber || !activeRole || !authorizedRoles.includes(activeRole)) {
        return { outcome: 'redirect', to: '/' };
    }
    if (requiredRole && activeRole !== requiredRole) {
        return { outcome: 'redirect', to: (0, navigation_1.getRoleHomePath)(activeRole) };
    }
    return { outcome: 'allow' };
}
