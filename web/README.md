# Web Client

React 18, Vite and TypeScript client for the Biometric Clocking Management System.

## Commands

```powershell
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env.local` for local development:

```text
VITE_API_BASE_URL=http://localhost:5000
VITE_ENABLE_ADMIN_HR_PORTALS=true
```

No biometric provider secret belongs in the web client. WebAuthn uses browser platform APIs and all attendance, identity, location and sequence decisions are validated by the backend.

## Production data behaviour

- Employee, department, user and work-location screens call the live API.
- Supervisor, HR and administrator attendance views use PostgreSQL attendance events.
- Legacy browser demo storage is removed during application startup.
- Unsupported payroll, settings and audit pages are not exposed as working features.

## Hosted build

Vercel configuration is committed in `vercel.json`. Use `web` as the Vercel project root and configure production variables in the Vercel dashboard.
