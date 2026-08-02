const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is missing. Add it to web/.env.local.",
  );
}

export const API_BASE_URL =
  configuredBaseUrl.replace(/\/+$/, "");