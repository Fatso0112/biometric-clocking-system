"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const httpClient_1 = require("./httpClient");
const ROLE_PRIORITY = [
    "admin",
    "hr",
    "supervisor",
    "employee",
];
function mapBackendRole(backendRole) {
    switch (backendRole) {
        case "SystemAdministrator":
            return "admin";
        case "HROfficer":
            return "hr";
        case "Supervisor":
            return "supervisor";
        case "Employee":
            return "employee";
        default:
            return null;
    }
}
async function authenticate(request) {
    try {
        const response = await (0, httpClient_1.apiRequest)("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: request.email.trim(),
                password: request.password,
            }),
        });
        if (!response.user.isActive) {
            return {
                status: "inactive",
                message: "This account is inactive. Contact an administrator.",
            };
        }
        const authorizedRoles = Array.from(new Set(response.user.roles
            .map(mapBackendRole)
            .filter((role) => role !== null)));
        const activeRole = ROLE_PRIORITY.find((role) => authorizedRoles.includes(role));
        if (!activeRole) {
            return {
                status: "unsupported_role",
                message: "This account does not have access to a supported portal.",
            };
        }
        return {
            status: "authenticated",
            identity: {
                userId: response.user.id,
                email: response.user.email,
                firstName: response.user.firstName,
                lastName: response.user.lastName,
                employeeId: response.user.employeeId,
                employeeNumber: null,
                authorizedRoles,
                activeRole,
                accessToken: response.accessToken,
                accessTokenExpiresAtUtc: response.accessTokenExpiresAtUtc,
                refreshToken: response.refreshToken,
                refreshTokenExpiresAtUtc: response.refreshTokenExpiresAtUtc,
            },
        };
    }
    catch (error) {
        if (error instanceof httpClient_1.ApiError) {
            if (error.status === 401) {
                return {
                    status: "invalid_credentials",
                    message: "The email address or password is incorrect.",
                };
            }
            return {
                status: "unavailable",
                message: error.message,
            };
        }
        return {
            status: "unavailable",
            message: "Login failed unexpectedly. Please try again.",
        };
    }
}
