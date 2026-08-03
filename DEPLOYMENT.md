# Deployment Guide

Target topology:

- React/Vite frontend on Vercel
- ASP.NET Core API on Railway
- PostgreSQL attached to the Railway API service

## 1. Verify locally

```powershell
.\scripts\verify-release.ps1
```

The release gate installs frontend dependencies, runs frontend tests and production build, then restores, builds and tests the .NET solution.

## 2. Vercel configuration

Use:

```text
Root Directory: web
Framework Preset: Vite
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Environment variables:

```text
VITE_API_BASE_URL=https://your-api-domain.up.railway.app
VITE_ENABLE_ADMIN_HR_PORTALS=true
```

The committed `web/vercel.json` rewrites client-side routes to `index.html` and enables the required same-origin browser permissions.

## 3. Railway configuration

Use `backend` as the service root. Configure:

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
ConnectionStrings__DefaultConnection=<Railway PostgreSQL connection string>
Jwt__Issuer=ClockingManagement.Api
Jwt__Audience=ClockingManagement.Clients
Jwt__SigningKey=<random secret of at least 32 characters>
Jwt__AccessTokenMinutes=15
Jwt__RefreshTokenDays=7
Cors__AllowedOrigins__0=https://your-project.vercel.app
Swagger__Enabled=false
WebAuthn__RpId=your-project.vercel.app
WebAuthn__RpName=HR Attendance Management System
WebAuthn__AllowedOrigins__0=https://your-project.vercel.app
```

`WebAuthn__RpId` is the hostname only. CORS and allowed origins use the full HTTPS origin, without a trailing slash.

For the first clean deployment only:

```text
SeedAdmin__Enabled=true
SeedAdmin__Email=<administrator email>
SeedAdmin__Password=<strong temporary password>
```

After successful administrator login, set `SeedAdmin__Enabled=false`, redeploy and replace the temporary password through the approved process.

The API applies EF Core migrations at startup and exposes `/health/ready` for Railway readiness checks.

## 4. Initial database-backed setup

1. Create the actual work location and geofence.
2. Create departments.
3. Create employee records.
4. Create user accounts linked to employees and assign roles.
5. Sign in on the employee's production phone.
6. Open **Profile → Manage Device Biometrics → Register This Device**.
7. Complete the phone's platform-authenticator prompt.
8. Test Clock In → Start Break → End Break → Clock Out.

Approved-network matching should remain disabled until valid office CIDR ranges and trusted proxy forwarding are configured and tested.

## 5. Hosted smoke test

Confirm these requests succeed:

```text
POST /api/v1/auth/login
GET  /api/v1/employees/me
GET  /api/v1/webauthn/credentials
POST /api/v1/webauthn/registration/options
POST /api/v1/webauthn/registration/complete
GET  /api/v1/attendance/today/{employeeId}
POST /api/v1/webauthn/authentication/options
POST /api/v1/webauthn/authentication/complete
POST /api/v1/attendance/clock-in
POST /api/v1/attendance/break/start
POST /api/v1/attendance/break/end
POST /api/v1/attendance/clock-out
GET  /api/v1/attendance/history/me
GET  /api/v1/attendance/dashboard
GET  /api/v1/attendance/history?fromUtc=...&toUtc=...
```

Expected sequence:

```text
NotPresent → Working → OnBreak → Working → Completed
```

Refresh after every action and verify that status, history, dashboard and reports remain consistent because they are read from PostgreSQL.

## 6. Remove legacy test data

The application removes old browser demo storage automatically. Old database test records are not deleted automatically.

After taking a PostgreSQL backup, review and run:

```text
scripts/purge-legacy-mock-data.sql
```

The script is preview-only by default and stops at a confirmation guard. After reviewing the counts and taking a backup, uncomment its confirmation `SET` statement to delete only old provider-generated biometric attendance/test rows and empty legacy biometric profiles. It does not delete employees, users, departments, work locations or WebAuthn credentials.

## 7. Troubleshooting

### CORS failure

Confirm the Railway CORS origin exactly matches the Vercel production origin. Preview URLs are separate origins.

### WebAuthn origin or RP failure

Confirm the production hostname matches `WebAuthn__RpId` and `WebAuthn__AllowedOrigins__0`. A credential registered for an unrelated RP ID must be registered again.

### Geofence rejection

Check employee work-location assignment, office coordinates, radius, permitted accuracy and browser location permission.

### Unregistered device

Open the employee profile and register the current device. There is no administrator-created verification bypass.

### Empty reports

Reports display stored attendance events only. Confirm the selected range, employee work-location assignment and that events exist in PostgreSQL.

## 8. Remaining production work

Before broad organisational rollout, complete monitoring, alerting, backup validation, retention, POPIA procedures, secure password reset, supervisor/team scoping, schedules/leave/holiday rules, payroll approval rules and stronger production session-storage design.
