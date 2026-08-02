"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.apiRequest = apiRequest;
const api_1 = require("../config/api");
class ApiError extends Error {
    constructor(status, message, problem) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errorCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "ApiError";
        this.status = status;
        this.errorCode = problem?.errorCode;
        this.errors = problem?.errors;
    }
}
exports.ApiError = ApiError;
function buildUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${api_1.API_BASE_URL}${normalizedPath}`;
}
async function apiRequest(path, options = {}, accessToken) {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }
    let response;
    try {
        response = await fetch(buildUrl(path), {
            ...options,
            headers,
        });
    }
    catch {
        throw new ApiError(0, "The backend could not be reached. Check your connection and API configuration.");
    }
    if (!response.ok) {
        let problem;
        try {
            problem =
                (await response.json());
        }
        catch {
            problem = undefined;
        }
        throw new ApiError(response.status, problem?.message ??
            `The request failed with status ${response.status}.`, problem);
    }
    if (response.status === 204) {
        return undefined;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return (await response.json());
    }
    return (await response.text());
}
