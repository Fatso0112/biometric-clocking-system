# Deployment Guide

This repository is configured for the following hosted MVP topology:

- React/Vite frontend on Vercel
- ASP.NET Core API on Railway
- PostgreSQL attached to the Railway API service

The hosted MVP uses the backend mock face provider. It is not production facial recognition or physical fingerprint-device integration.

## 1. Verify the release locally

From the repository root in PowerShell:

```powershell
.\scripts\verify-release.ps1
```

This installs dependencies, runs frontend tests and build, then restores, builds and tests the .NET solution.

## 2. Generate and rotate the JWT signing key

A signing key must never be committed. Generate a fresh value in PowerShell:

```powershell
$bytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Store the result only as the Railway variable `Jwt__SigningKey`. Rotate the currently deployed key because an earlier development configuration contained a hardcoded key. Rotation invalidates existing access and refresh sessions, so users must log in again.

## 3. Deploy the frontend to Vercel

Create a Vercel project from the Git repository with:

- Root Directory: `web`
- Framework Preset: Vite
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

Add production variables:

```text
VITE_API_BASE_URL=https://your-api-domain.up.railway.app
VITE_ENABLE_ADMIN_HR_PORTALS=true
VITE_ENABLE_MOCK_BIOMETRIC=true
```

`VITE_ENABLE_MOCK_BIOMETRIC=true` is for the hosted MVP only. Set it to `false` when an approved production biometric integration replaces the mock route.

The committed `web/vercel.json` sends client-side routes to `index.html`, allows camera/geolocation for the same origin and applies basic response headers.

Deploy and copy the exact Vercel origin, for example:

```text
https://your-project.vercel.app
```

Do not include a trailing slash when adding it to CORS.

## 4. Configure the Railway backend

Use `backend` as the Railway service root directory. The committed `backend/railway.json` selects the Dockerfile and configures `/health/ready` as the health check.

Set these service variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
ConnectionStrings__DefaultConnection=<Railway PostgreSQL connection string>
Jwt__Issuer=ClockingManagement.Api
Jwt__Audience=ClockingManagement.Clients
Jwt__SigningKey=<new random secret>
Jwt__AccessTokenMinutes=15
Jwt__RefreshTokenDays=7
Cors__AllowedOrigins__0=https://your-project.vercel.app
Swagger__Enabled=false
```

For the first clean deployment only, seed one administrator:

```text
SeedAdmin__Enabled=true
SeedAdmin__Email=<administrator email>
SeedAdmin__Password=<strong temporary password>
```

After the administrator can log in, change `SeedAdmin__Enabled` to `false` and redeploy. Change the temporary password through an approved administrator process.

The API automatically applies EF Core migrations at startup. The deployment will fail instead of serving traffic when the database, JWT or production CORS configuration is missing.

Railway terminates public TLS and forwards traffic to the HTTP-only application container. The API deliberately avoids production `UseHttpsRedirection()` inside the container so `/health/ready` remains a direct HTTP 200 response and does not enter a proxy redirect loop. Public users still access the Railway HTTPS domain.

## 5. Initial application setup

Log in as the seeded system administrator and complete these steps in order:

1. Open **Work Locations** and create the office geofence. Use the actual office coordinates. Leave approved-network matching disabled until valid office CIDR ranges are configured.
2. Open **Departments** and create at least one department.
3. Open **Employees** and create the employee record.
4. Open **Users** and create a login account linked to that employee, assigning the `Employee` role.
5. Return to **Employees** and select **Enroll mock face** for the employee.
6. Log out and sign in using the employee account.
7. Complete Clock In → Start Break → End Break → Clock Out.

The backend is authoritative for employee identity, biometric-profile state, event sequence, location, duplicate IDs and attendance status.

## 6. Hosted smoke test

Keep the browser Network tab open and confirm these requests succeed:

```text
POST /api/v1/auth/login
GET  /api/v1/employees/me
GET  /api/v1/attendance/today/{employeeId}
POST /api/v1/biometric-verifications/mock
POST /api/v1/attendance/clock-in
POST /api/v1/attendance/break/start
POST /api/v1/attendance/break/end
POST /api/v1/attendance/clock-out
GET  /api/v1/attendance/history/me
```

Expected attendance sequence:

```text
NotPresent → Working → OnBreak → Working → Completed
```

Refresh the page after every action. The status and history must remain correct because they are read from PostgreSQL.

## 7. Deployment troubleshooting

### CORS error

Confirm `Cors__AllowedOrigins__0` exactly matches the Vercel origin and redeploy the API. Preview deployment URLs are different origins and must be added as additional indexed entries when preview-to-API access is required.

### Geofence rejection

Check the employee's assigned work location, office coordinates, allowed radius, maximum GPS accuracy and browser location permission. The frontend captures evidence; the backend makes the final decision.

### Approved-network rejection

For a public hosted MVP, set `RequireIpMatch` to false on the work location unless the real office CIDR ranges and proxy forwarding are configured and tested.

### Biometric profile not enrolled

Log in as the administrator, open **Employees**, and create the employee's mock face enrolment.

### Login works but employee routes fail

Verify the user account is linked to the employee record and has the `Employee` role. A system administrator account is intentionally allowed to exist without an employee link.

## 8. Production limitations

Before real organisational use, replace or complete:

- mock biometric verification with an approved provider and liveness/device controls;
- browser/local-storage refresh-token handling with a stronger production session architecture;
- self-service password reset with a secure email/OTP workflow;
- full work-location network management and trusted-proxy restrictions;
- real attendance corrections, payroll and some reporting/settings pages still marked as prototype/demo;
- monitoring, alerting, backups, retention and POPIA operating procedures.
