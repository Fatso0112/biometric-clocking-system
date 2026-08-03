# WebAuthn Device Verification for Attendance

## Scope

This integration replaces production mock biometric verification with a WebAuthn platform-authenticator ceremony. Each attendance action requires a fresh signed assertion before the attendance API accepts it.

Required sequence:

1. The employee captures current location evidence.
2. The backend creates a five-minute WebAuthn challenge bound to one attendance action.
3. The browser asks the phone's platform authenticator to verify the user.
4. The backend verifies the signed assertion, exact origin, relying-party ID, credential ownership, signature counter and user-verification requirement.
5. The backend creates a five-minute, single-use attendance verification token bound to the same action.
6. The attendance endpoint atomically consumes that token while persisting the event.

The action binding prevents a token issued for `ClockIn` from being used for `ClockOut`, `BreakStart` or `BreakEnd`.

## Web limitation

A hosted website can require local user verification, but the operating system may permit a configured device PIN or passcode as a fallback. The website does not receive the employee's face image, fingerprint image or biometric template, and it cannot reliably identify which local verification method the operating system used.

A native mobile application is required when policy must prohibit every non-biometric fallback.

## Database migration

After applying the source patch, generate the Entity Framework migration from the repository root:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"

dotnet ef migrations add AddWebAuthnDeviceCredentials `
  --project .\backend\src\ClockingManagement.Infrastructure `
  --startup-project .\backend\src\ClockingManagement.Api `
  --output-dir Persistence\Migrations
```

Do not deploy until the generated migration and `ApplicationDbContextModelSnapshot.cs` are committed.

## Railway variables

Configure these variables before deploying the updated backend:

```text
WebAuthn__RpId=your-production-hostname.example.com
WebAuthn__RpName=HR Attendance Management System
WebAuthn__AllowedOrigins__0=https://your-production-hostname.example.com
Biometrics__EnableMockVerification=false
```

`WebAuthn__RpId` is a hostname only. Do not include `https://`, a path or a trailing slash.

`WebAuthn__AllowedOrigins__0` is the exact HTTPS origin. Do not include a trailing slash.

Use the stable production Vercel alias or a custom domain. Credentials registered for one relying-party ID will not work after changing to an unrelated domain, so employees would need to register again.

## Vercel variable

```text
VITE_ENABLE_MOCK_BIOMETRIC=false
```

Redeploy Vercel after changing the variable.

## Employee registration

After backend and frontend deployment:

1. Sign in as an employee on the production phone browser.
2. Open **Profile**.
3. Select **Manage Device Biometrics**.
4. Select **Register This Device**.
5. Complete the phone's verification prompt.
6. Return to the clocking screen.

Each registered credential can be revoked from the same screen.

## Required hosted test

Complete this sequence on a real phone:

```text
NotPresent
→ Clock In
→ Working
→ Start Break
→ OnBreak
→ End Break
→ Working
→ Clock Out
→ Completed
```

Refresh after each event. Also verify:

- cancelling the device prompt does not record attendance;
- a Clock In token cannot be submitted to Clock Out;
- a token cannot be reused;
- an unregistered phone is directed to device registration;
- mock verification returns 404 in Production;
- an employee cannot register or use another employee's credential;
- changing the frontend origin without updating WebAuthn configuration causes verification to fail rather than bypassing checks.
