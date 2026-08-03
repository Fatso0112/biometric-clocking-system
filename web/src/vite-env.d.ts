/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_ADMIN_HR_PORTALS?: string;
  readonly VITE_ENABLE_MOCK_BIOMETRIC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
