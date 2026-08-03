# Release Checklist

## Source and build

- [ ] Work is committed on a feature branch and reviewed before merging to `main`.
- [ ] No `.env`, `.env.local`, secrets, `node_modules`, `dist`, `bin`, `obj`, `.compiled` or test-result folders are committed.
- [ ] `npm ci`, `npm test`, `npm run typecheck` and `npm run build` pass in `web`.
- [ ] `dotnet restore`, `dotnet build --configuration Release` and `dotnet test --configuration Release` pass.
- [ ] The WebAuthn migration is committed and Railway applies it successfully.

## Production configuration

- [ ] Vercel uses the exact Railway API origin.
- [ ] Railway CORS allows the exact Vercel production origin.
- [ ] `WebAuthn__RpId` is the stable production hostname only.
- [ ] `WebAuthn__AllowedOrigins__0` is the exact HTTPS production origin.
- [ ] The JWT signing key is strong, private and stored only in Railway.
- [ ] Administrator seeding is disabled after first login.
- [ ] Swagger is disabled or restricted in Production.
- [ ] Approved-network checks are enabled only after CIDR and proxy validation.

## Live data verification

- [ ] Employee, department, user, role and work-location pages display PostgreSQL records.
- [ ] Supervisor, HR and administrator attendance views display backend events.
- [ ] Reports show only stored attendance data and do not invent absence or lateness.
- [ ] Empty database states show clear empty-state messages rather than generated records.
- [ ] Unsupported payroll, settings and audit features are not presented as working pages.

## Device verification

- [ ] An employee can register the production phone from the profile page.
- [ ] Registered devices are listed from the database and can be revoked.
- [ ] Clock In requires a fresh WebAuthn assertion.
- [ ] Start Break and End Break require fresh WebAuthn assertions.
- [ ] Clock Out requires a fresh WebAuthn assertion.
- [ ] Cancelling the device prompt records no attendance event.
- [ ] A verification token cannot be reused.
- [ ] A token issued for one attendance action cannot authorize another action.
- [ ] An employee cannot register or use another employee's credential.

## Attendance and security

- [ ] Full sequence passes: NotPresent → Working → OnBreak → Working → Completed.
- [ ] Direct-route refresh works on Vercel.
- [ ] Role guards reject cross-role access.
- [ ] Invalid login, denied GPS, outside-geofence and invalid-sequence errors are handled.
- [ ] Logout clears current and legacy session keys.
- [ ] `/health/ready` returns HTTP 200.
- [ ] Hosted smoke tests are completed because the current integration-test project may not discover executable tests.

## Legacy cleanup

- [ ] Browser legacy data is cleared by the startup cleanup.
- [ ] A PostgreSQL backup exists before any destructive cleanup.
- [ ] `scripts/purge-legacy-mock-data.sql` preview counts have been reviewed.
- [ ] The one-time database cleanup has been run only when old test attendance should be deleted.
