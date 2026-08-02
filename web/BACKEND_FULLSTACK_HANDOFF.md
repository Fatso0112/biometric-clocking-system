# Backend and Full-Stack Handoff

## Frontend baseline

The role-based frontend is implemented on the `FrontEnd` branch. The implementation baseline is commit `84249c8` (`feat(web): complete role-based attendance portals`).

The current frontend supports four roles through one session model:

| Role | Demo employee number | Default home |
| --- | --- | --- |
| Employee | `10001` | `/clock` |
| Supervisor | `20001` | `/supervisor/dashboard` |
| HR | `30001` | `/hr/dashboard` |
| Admin | `40001` | `/admin/dashboard` |

All demo accounts currently use the frontend-only password `demo123`. This password and the current `authenticate()` implementation are not production security.

## What is complete in the frontend

- One `SessionContext` and persisted `session:v3` schema for Employee, Supervisor, HR, and Admin.
- One login, role-home resolver, route-guard mechanism, role switcher, and logout path.
- Legacy partner session keys are removed from both `localStorage` and `sessionStorage`.
- Responsive Employee, Supervisor, HR, and Admin experiences.
- Admin workflows for employees, departments, role/team assignments, payroll, reports, users, audit logs, settings, and profile.
- HR workflows for attendance, reports, payroll, settings, profile, and reuse of the Employee biometric clocking flow.
- Canonical routes plus redirect-only aliases for legacy partner routes.
- A build-time portal kill switch through `VITE_ENABLE_ADMIN_HR_PORTALS`; set it explicitly to `false` to hide and block Admin/HR portal exposure.
- Strict TypeScript, automated contract/session/guard/integration tests, and a successful production build.

## Current frontend-only data authority

The Admin and HR portals currently use the browser-persisted repository in `src/services/portalDemoRepository.ts` under the storage key `portal-demo:v1`.

It is the temporary frontend authority for:

- employees and departments;
- attendance records;
- role assignments;
- supervisor team assignments;
- payroll records;
- audit events;
- portal settings.

The existing Supervisor team service reads from the same repository. This deliberately proves that Admin role/team changes and the Supervisor portal share one model instead of maintaining separate Supervisor entities.

This repository must be replaced behind typed service boundaries. Do not connect screens directly to Axios, `fetch`, or endpoint-specific response shapes.

## Canonical frontend contracts

The canonical vocabulary and boundary adapters are defined in:

- `src/types/canonicalDomain.ts`
- `src/types/portalDemo.ts`
- `src/types/workforce.ts`
- `src/services/canonicalDomainAdapters.ts`

Key rules:

- `employeeNumber` is the canonical person identifier. Do not introduce a second persisted `staffNumber` field.
- Employee names remain `firstName` and `lastName`; `fullName` is derived for display.
- Relationships use IDs, including `departmentId`, employee IDs/numbers, and assignment IDs.
- Employee state is normalized to the `active | inactive` frontend union.
- Do not introduce a permanent standalone Supervisor entity. A supervisor is an Employee with a `RoleAssignment`; team membership is a separate assignment.
- Backend response envelopes must be normalized in adapters. Screens should consume canonical frontend types, not raw transport DTOs.

The canonical Attendance shape is:

```ts
{
  id: string;
  employeeId: string;
  employeeNumber: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  durationMinutes: number | null;
  source: AttendanceSource;
  verificationResult: AttendanceVerificationResult;
}
```

Treat the current type map as DTO Mapping v1. Breaking transport or domain changes should produce an explicit v2 mapping instead of silently changing v1 assumptions.

## Authentication and authorization handoff

The backend must become authoritative for authentication and authorization.

The login integration point is `src/services/authApi.ts`. Replace the marked `TODO(BACKEND-AUTH)` boundary without creating another login or session system.

The authenticated identity required by the frontend is:

```ts
type AuthenticatedIdentity = {
  employeeNumber: string;
  authorizedRoles: readonly UserRole[];
  activeRole: UserRole;
};
```

Backend requirements:

- authenticate credentials securely;
- return or expose authoritative active role assignments;
- reject inactive or revoked users;
- authorize every protected operation server-side;
- provide a secure logout/session-expiry mechanism;
- log grants and revocations of privileged roles;
- define token or cookie renewal and expiry behavior.

`ProtectedRoute` is a frontend UX boundary only. It must never be treated as backend authorization.

Do not reintroduce any of the partner keys or mechanisms: `hrSession`, `auth`, `token`, `currentUser`, `hrUsers.ts`, or separate Admin/HR login implementations.

## Backend capability backlog

Before wiring data, agree on and publish an OpenAPI specification. The full-stack implementation should then replace mock boundaries domain by domain.

| Domain | Frontend boundary | Backend capability required |
| --- | --- | --- |
| Authentication | `services/authApi.ts` | Login, logout/session expiry, authoritative roles, inactive-user handling |
| Employees | `services/employeeApi.ts`, `portalDemoRepository.ts` | Employee queries and mutations using canonical IDs and split names |
| Departments | `portalDemoRepository.ts` | Department queries and mutations with stable IDs |
| Attendance | `services/attendanceApi.ts`, `teamAttendanceApi.ts` | Employee/HR/Supervisor queries, clock-in/out, status and duration rules |
| Biometrics | `faceRecognitionApi.ts`, `webauthnApi.ts` | Enrollment, verification, replay protection, failure reasons, auditability |
| Role assignments | `portalDemoRepository.ts` | Grant/revoke roles with policy enforcement and audit records |
| Team assignments | `services/teamApi.ts`, `portalDemoRepository.ts` | Assign/remove members, validate supervisors, define reporting constraints |
| Payroll | `portalDemoRepository.ts` | Pay-period records, approval/status workflow, authorization |
| Audit logs | `portalDemoRepository.ts` | Append-only privileged action history and authorized querying/export |
| Settings/profile | `portalDemoRepository.ts`, `employeeApi.ts` | Persisted organization settings and employee/admin profile operations |

The repository's existing .NET capabilities should remain authoritative where they already exist. If a partner backend also exists, perform a contract-convergence audit before choosing either contract.

## Business decisions still required

The backend/full-stack owners must confirm these rules before privileged mutations become production operations:

- Who may grant or revoke Supervisor, HR, and Admin roles?
- Who may assign employees to supervisors?
- May one employee report to multiple supervisors?
- What happens to team assignments when a Supervisor role is revoked?
- Which privileged actions are audited, and who may view the audit log?
- Which payroll transitions are valid, and who may perform them?
- What are the retention and privacy rules for biometric data and audit records?

The demo UI demonstrates these workflows; it does not establish final business policy.

## Mock limitations to account for

- Data is local to one browser and is not shared between devices or users.
- The demo password is shared and intentionally insecure.
- Role changes are reflected authoritatively on the next authentication; production session invalidation must be defined by the backend.
- Mock attendance and payroll records are deterministic examples, not accounting or labor-law rules.
- Browser storage is not an acceptable source of truth for privileged data.
- Exported reports reflect only the locally available demo dataset.

## Recommended integration sequence

1. Publish and review the OpenAPI contract and error shapes.
2. Replace `authenticate()` and implement server-side RBAC/session expiry.
3. Wire read-only Employee and Department adapters to existing backend capabilities.
4. Implement Attendance and biometric contracts, including failure handling.
5. Implement RoleAssignment and TeamAssignment policies and audited mutations.
6. Implement Payroll, audit-log, settings, and profile persistence after their product contracts are approved.
7. Run end-to-end tests for all four roles, cross-role denial, expired sessions, empty states, validation failures, timeouts, and backend errors.
8. Disable or remove `portal-demo:v1` only after every consuming service has an authoritative replacement.

## Verification commands

From `web/`:

```bash
npm test
npm run typecheck
npm run build
```

At handoff, all 17 automated tests and the production build pass. The Admin and HR canonical routes were also exercised at desktop and mobile viewport sizes with no browser console errors.

## Definition of backend/full-stack completion

The integration is complete when:

- no production screen depends on `portal-demo:v1`;
- authentication and every privileged operation are authorized by the backend;
- canonical adapters cover successful, empty, validation, authentication, authorization, timeout, and server-error responses;
- Admin-created users and assignments are visible to HR/Supervisor consumers through the shared backend model;
- audit events are durable and queryable according to the approved policy;
- all frontend tests, backend contract tests, and cross-role end-to-end tests pass;
- the Admin/HR kill switch can be removed through an explicit release decision.
