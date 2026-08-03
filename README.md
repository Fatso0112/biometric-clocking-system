# Biometric Clocking Management System

A full-stack attendance system built with React, TypeScript, ASP.NET Core 8, Entity Framework Core and PostgreSQL.

## Current integrated scope

- Email/password authentication with JWT access tokens and rotating refresh tokens
- Role-aware Employee, Supervisor, HR and Administrator routes
- PostgreSQL-backed employee, department, user-account, role and work-location management
- Browser GPS capture with backend geofence and network validation
- WebAuthn device verification before Clock In, Start Break, End Break and Clock Out
- Backend-authoritative attendance status, history, organisation dashboard and reports
- Registered-device management and revocation
- Vercel frontend and Railway API/PostgreSQL deployment configuration
- CI workflow and release verification script

The application does not receive fingerprint images, face images or biometric templates. The phone's platform authenticator performs local user verification and returns a signed WebAuthn assertion. Depending on the phone's security settings, the operating system may allow a device PIN or passcode fallback.

Legacy browser-generated workforce, attendance, payroll, report and audit records have been removed. Pages without a supporting database API are no longer presented as working features.

## Local setup

### Backend

Use secure environment variables or .NET user secrets based on `backend/.env.example`. Never commit real values.

```powershell
dotnet restore ClockingManagement.sln
dotnet build ClockingManagement.sln
dotnet run --project backend\src\ClockingManagement.Api\ClockingManagement.Api.csproj
```

### Frontend

```powershell
cd web
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` in `web/.env.local` to the API origin.

## Verification

```powershell
.\scripts\verify-release.ps1
```

## Deployment and cleanup

See [DEPLOYMENT.md](DEPLOYMENT.md), [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), [MVP_SCOPE.md](MVP_SCOPE.md) and [docs/WEBAUTHN_ATTENDANCE.md](docs/WEBAUTHN_ATTENDANCE.md).

A one-time, review-before-running PostgreSQL cleanup script for old test biometric records is available at `scripts/purge-legacy-mock-data.sql`.
