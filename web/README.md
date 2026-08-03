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
VITE_ENABLE_MOCK_BIOMETRIC=true
```

The mock biometric flag is for MVP testing and must remain clearly labelled. Attendance, identity, location and sequence decisions are validated by the API.

## Hosted build

Vercel configuration is committed in `vercel.json`. Use `web` as the Vercel project root and set the production variables in the Vercel dashboard.
