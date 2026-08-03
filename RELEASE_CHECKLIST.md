# Release Checklist

## Build and source control

- [ ] `npm ci`, `npm test` and `npm run build` pass in `web`.
- [ ] `dotnet restore`, `dotnet build` and `dotnet test` pass for `ClockingManagement.sln`.
- [ ] GitHub Actions is green.
- [ ] No `.env`, `.env.local`, signing keys, database passwords or tokens are committed.
- [ ] The previous JWT key has been rotated.
- [ ] Patch folders, compiled test output, `bin`, `obj`, `dist` and `node_modules` are absent from the commit.

## Railway API

- [ ] Service root is `backend`.
- [ ] PostgreSQL connection string is configured.
- [ ] Production JWT issuer, audience and new signing key are configured.
- [ ] Exact Vercel origins are configured under `Cors__AllowedOrigins__N`.
- [ ] `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` is set and proxy/IP behaviour is tested.
- [ ] `/health/live` returns 200.
- [ ] `/health/ready` returns 200 and confirms database readiness.
- [ ] EF Core migrations apply successfully to a clean database.
- [ ] Swagger is disabled or deliberately restricted in production.
- [ ] Seed administrator is disabled after initial setup.

## Vercel frontend

- [ ] Root directory is `web`.
- [ ] `VITE_API_BASE_URL` uses the Railway HTTPS domain.
- [ ] SPA refresh works on `/clock`, `/admin/employees` and other direct routes.
- [ ] Camera and geolocation permissions work over HTTPS.
- [ ] Mock biometric is clearly labelled and enabled only for the MVP environment.

## Application setup

- [ ] At least one active work location exists with correct coordinates and timezone.
- [ ] At least one active department exists.
- [ ] Employee record is active and assigned to the correct location.
- [ ] User account is linked to the employee and has the `Employee` role.
- [ ] Employee has an active mock face enrolment.

## Acceptance tests

- [ ] Valid and invalid login.
- [ ] Session survives refresh.
- [ ] Access token refresh rotates tokens without losing the active role.
- [ ] Logout clears the session and revokes the refresh token on a best-effort basis.
- [ ] Employee cannot access admin or HR routes.
- [ ] Employee cannot request verification or clock attendance for another employee ID.
- [ ] Clock In changes status to `Working`.
- [ ] Start Break changes status to `OnBreak`.
- [ ] End Break changes status to `Working`.
- [ ] Clock Out changes status to `Completed`.
- [ ] Attendance history remains after refresh.
- [ ] Duplicate and invalid sequence attempts are rejected.
- [ ] Reused and expired biometric tokens are rejected.
- [ ] Missing/disabled biometric profile is handled clearly.
- [ ] Denied GPS, inaccurate GPS, outside-geofence and network-rule failures are handled clearly.
- [ ] Rate limits return HTTP 429 under repeated abuse.
