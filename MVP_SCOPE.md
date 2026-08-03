# Hosted MVP Scope

This repository is deployable as a hosted attendance MVP using Vercel, Railway and PostgreSQL. The following boundary is intentional and must remain visible during demonstrations and acceptance testing.

## Live, backend-integrated capabilities

- Email/password login, rotating refresh tokens, logout and role-aware route protection
- Employee, department, user-account, role and work-location creation
- Employee-linked profile lookup
- Administrator-created mock face enrolment
- Browser GPS evidence capture with backend geofence/network validation
- Clock In, Start Break, End Break and Clock Out
- Backend-authoritative current status and employee attendance history
- Duplicate event, invalid sequence, expired token and ownership checks
- Health endpoints, EF Core migrations, production CORS, rate limits and deployment configuration

## Prototype or intentionally unavailable capabilities

- Real facial recognition, liveness verification or physical fingerprint-device integration
- Employee self-service biometric enrolment
- Employee record update endpoint
- Secure self-service password-reset delivery
- Team-scoped supervisor resource filtering where supervisor/team assignments are not yet modelled by the backend
- Some HR attendance, dashboard, payroll, reporting, settings and audit pages that are explicitly labelled as frontend demo/prototype pages
- Production monitoring, alerting, backup verification, retention and POPIA operating procedures

## Release interpretation

A successful hosted MVP proves the end-to-end attendance flow with a mock biometric provider. It must not be described as a production biometric attendance platform until the unavailable capabilities above are implemented, secured and accepted.
