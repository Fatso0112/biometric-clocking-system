# Integration Completion Changelog

## Authentication and sessions

- Connected email/password login to the live ASP.NET authentication API.
- Added employee number to login, refresh and current-user responses.
- Added persisted `session:v4` identity state.
- Added proactive and 401-triggered refresh-token rotation.
- Added best-effort backend logout and reliable local session cleanup.
- Added live employee-profile retrieval from `GET /api/v1/employees/me`.

## Attendance

- Connected Clock In, Start Break, End Break and Clock Out to live API routes.
- Made backend today-summary status authoritative.
- Added browser GPS evidence with captured timestamp and accuracy.
- Added employee-scoped attendance-history endpoint and live history/summary UI.
- Corrected worked-time aggregation to subtract completed breaks.
- Marked absence and lateness as unavailable until approved schedules exist.
- Updated PDF exports to reflect these calculation limitations.
- Removed the legacy browser-local attendance persistence path so live attendance reads come from the backend.
- Removed the obsolete client-side geofence service and state machine; the browser now captures evidence while the backend remains authoritative.

## Biometrics

- Connected attendance verification to the protected mock verification endpoint.
- Added active-profile/enrolment handling and clear not-enrolled flow.
- Added administrator action to create an explicitly labelled mock face enrolment.
- Removed misleading employee self-enrolment success flows from the hosted MVP.
- Restricted biometric verification to the linked employee account.
- Added employee-number fallback resolution for face, fingerprint and mock attendance flows when an older authentication response omits it.

## Administration

- Retained live department, employee, user and role management integration.
- Added live work-location creation for initial geofence setup.
- Added biometric status to the administrator employee directory.
- Kept unimplemented edit operations disabled rather than pretending to save them.

## Deployment and quality

- Removed the committed JWT signing key from configuration.
- Added production CORS validation, rate limiting, forwarded-header handling, health checks and platform-port binding.
- Added Railway Docker/health-check configuration.
- Added Vercel SPA and browser-permission configuration.
- Added GitHub Actions frontend/backend build and test workflow.
- Added a PowerShell release-verification script with residue, committed-key and obvious-credential checks.
- Prevented Railway readiness redirect loops by keeping the container HTTP-only behind Railway TLS termination.
- Made explicitly enabled administrator seeding fail fast when seed credentials are missing.
- Removed stale patch folders, generated test output and handoff residue from the release package.
- Updated stale session, route and prototype tests for the live authentication boundary.
- Removed failed employee-profile request caching so a transient failure can recover after token or session changes.
