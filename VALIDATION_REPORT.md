# Production Data Cleanup Validation Report

Validation date: 2026-08-03

This report covers the cleanup that removes browser-generated workforce and attendance data, visible mock-biometric controls, mock biometric API routes/providers, and unsupported prototype pages. Supported dashboards and reports now load employee, department, account, work-location and attendance information through the ASP.NET Core API backed by PostgreSQL.

## Implemented cleanup

- Removed the visible test/mock biometric button and retired face/fingerprint simulation routes.
- Kept WebAuthn device verification as the only attendance verification flow.
- Removed frontend mock workforce, attendance, absence, payroll, audit and portal repositories.
- Replaced supported Admin, HR and Supervisor dashboards/reports with API-backed data.
- Removed unsupported payroll, settings and audit pages from production navigation rather than presenting invented records.
- Added startup cleanup for old browser storage keys without clearing the authenticated session.
- Removed mock enrolment/verification controllers and mock provider registrations from the backend.
- Extended organisation attendance history with employee/date filters for live reports.
- Added a review-before-running PostgreSQL script for deleting historical mock-provider attendance and biometric rows.
- Updated environment examples, CI checks, deployment guidance and release documentation.

## Completed checks in this environment

| Check | Result |
|---|---|
| Frontend TypeScript/TSX syntax transpilation | 82 files checked, 0 failures |
| Frontend relative-import resolution | 82 files checked, 0 missing imports |
| Supplemental semantic TypeScript pass using temporary dependency declarations | Passed |
| Frontend pure TypeScript test compilation | Passed |
| Frontend Node test suite | 14 passed, 0 failed |
| JSON parsing | 10 files parsed, 0 failures |
| MSBuild XML parsing | 6 files parsed, 0 failures |
| Backend C# delimiter/structure scan | 82 files checked, 0 failures |
| Retired mock-route/provider/source scan | No production matches |
| Forbidden secret-file scan | No files found |
| Obvious private-key, PostgreSQL credential-URL and bearer-token scan | No matches |
| Committed `Jwt:SigningKey` | Confirmed empty |
| Patch replay against the uploaded repository | Exact source-tree match |
| Full cleaned project ZIP replay | Exact source-tree match |
| SHA-256 source manifest | 222 entries verified |

The supplemental TypeScript pass uses temporary declarations for installed libraries. It detects internal TypeScript consistency and import problems, but it is not a substitute for the real Vite dependency-aware build.

## Environment limitations

A complete `npm ci` could not be run in this sandbox because its internal npm mirror returned HTTP 404 for packages that are present in the committed lockfile. This is an environment registry-cache limitation; it does not prove the production frontend build passes.

The .NET SDK is not installed in this sandbox, so `dotnet restore`, `dotnet build` and `dotnet test` could not be executed here.

The repository's integration-test assembly historically compiled without discovering tests. Hosted negative and end-to-end checks therefore remain required even after the local release gate passes.

## Required local release gate

Run from the repository root on the developer machine:

```powershell
.\scripts\verify-release.ps1
```

Do not merge or deploy until this finishes without TypeScript, Vite, .NET build or test failures.

## Database cleanup is intentionally manual

The source cleanup does not silently delete production records. After taking a Railway PostgreSQL backup, review and run:

```text
scripts/purge-legacy-mock-data.sql
```

The script runs in preview-only mode by default and stops at a confirmation guard. After the backup and counts are reviewed, an explicit `SET app.confirm_legacy_mock_purge = 'YES';` enables deletion of only legacy mock-provider attendance events, verification sessions, recognition attempts, provider enrolments and empty legacy biometric profiles. It does not delete employees, user accounts, departments, work locations or WebAuthn credentials.

## Deployment sequence

1. Apply the source patch on `feature/production-data-cleanup`.
2. Run the local release gate and review the diff.
3. Back up PostgreSQL and run the optional legacy-data cleanup script when its preview is correct.
4. Merge to `main`.
5. Deploy the Railway backend first.
6. Deploy the Vercel frontend.
7. Test device registration and the full Clock In → Break → Clock Out sequence on a phone.
