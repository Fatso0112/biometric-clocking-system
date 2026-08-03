# Production Data and WebAuthn Integration Changelog

## Authentication and sessions

- Connected email/password login, refresh-token rotation, logout and current-user profile lookup to the ASP.NET API.
- Retained role-protected Employee, Supervisor, HR and Administrator routes.
- Added startup cleanup for legacy browser data without clearing the authenticated session.

## Attendance

- Connected Clock In, Start Break, End Break and Clock Out to live API routes.
- Kept backend today-summary status and attendance sequence authoritative.
- Added organisation history date filters and a bounded report limit.
- Replaced generated supervisor, HR and administrator attendance records with PostgreSQL events.
- Replaced generated workforce totals with live employee and attendance dashboard responses.
- Updated PDF reports to use database aggregates.
- Avoided inventing absence, lateness and overtime where schedule rules are unavailable.

## Device verification

- Requires fresh WebAuthn verification for every attendance action.
- Supports employee device registration, listing and revocation.
- Removed legacy face/fingerprint simulation pages, buttons, frontend services and API controllers.
- Removed legacy biometric provider dependency registrations and production feature flags.

## Administration and portal pages

- Employee, department, user-account, role and work-location pages use backend APIs.
- Profile pages show authenticated/database values and do not pretend to save unsupported edits.
- Payroll, settings and audit screens without corresponding backend APIs were removed from navigation and redirected to supported live pages.

## Cleanup and release

- Removed browser-local workforce, attendance, payroll, report and audit repositories.
- Added `scripts/purge-legacy-mock-data.sql` for optional one-time deletion of old test biometric records after a database backup.
- Updated environment examples, CI, tests and deployment documentation.
