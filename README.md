# Biometric Clocking Management System

A full-stack attendance MVP built with React, TypeScript, ASP.NET Core 8, Entity Framework Core and PostgreSQL.

## Current integrated scope

- Email/password authentication with JWT access tokens and rotating refresh tokens
- Role-aware Employee, Supervisor, HR and Administrator routes
- Live employee, department, user and work-location setup
- GPS-backed Clock In, Start Break, End Break and Clock Out
- Backend-authoritative attendance status and employee history
- Administrator-managed mock biometric enrolment
- Vercel frontend and Railway API deployment configuration
- CI build/test workflow and release verification script

The biometric provider is deliberately a mock provider for MVP testing. The project does not yet provide production facial recognition, liveness checks or physical fingerprint hardware integration.

## Local setup

### Backend

Copy `backend/.env.example` values into your secure local configuration or user secrets. Never commit real values.

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

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md), [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), [MVP_SCOPE.md](MVP_SCOPE.md) and [VALIDATION_REPORT.md](VALIDATION_REPORT.md).
