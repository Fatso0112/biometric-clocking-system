# Hosted System Scope

## Live, database-backed capabilities

- Email/password login, rotating refresh tokens, logout and role-aware route protection
- Employee, department, user-account, role and work-location management
- Employee-linked profile lookup
- Employee self-registration and revocation of WebAuthn device credentials
- Fresh WebAuthn verification for Clock In, Start Break, End Break and Clock Out
- Browser GPS evidence with backend geofence and approved-network validation
- Backend-authoritative current attendance status and employee history
- Organisation attendance dashboard and date-range reports built from PostgreSQL attendance events
- Duplicate-event, invalid-sequence, expired-token, action-binding and ownership checks
- Health endpoints, EF Core migrations, production CORS, rate limits and deployment configuration

## Intentionally unavailable until supported by backend rules and APIs

- Raw facial recognition, liveness detection or direct access to fingerprint hardware from the website
- Strict biometric-only enforcement that forbids every operating-system PIN/passcode fallback
- Employee record update where no approved update endpoint exists
- Secure self-service password-reset delivery
- Schedule-derived absence, lateness, overtime and holiday calculations
- Team-scoped supervisor filtering until supervisor/team assignments are modelled authoritatively
- Payroll processing, system-settings editing and audit-log screens without dedicated backend APIs
- Production monitoring, alerting, backup verification, retention and POPIA operating procedures

## Data interpretation

Attendance screens and reports display only records returned by the API and stored in PostgreSQL. The frontend does not invent absent or late days when schedules, leave and holiday rules are unavailable.
