"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_BASE_URL = void 0;
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
if (!configuredBaseUrl) {
    throw new Error("VITE_API_BASE_URL is missing. Add it to web/.env.local.");
}
exports.API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
