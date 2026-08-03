# WebAuthn Device Verification for Attendance

## Attendance sequence

Every attendance action requires a fresh signed WebAuthn assertion:

1. The employee captures current location evidence.
2. The backend creates a five-minute challenge bound to one attendance action.
3. The browser asks the phone's platform authenticator to verify the user.
4. The backend verifies the challenge, origin, relying-party ID, credential ownership, signature and user-verification flag.
5. The backend issues a five-minute, single-use verification token bound to the same action.
6. The attendance endpoint consumes the token atomically while saving the event.

A token issued for `ClockIn` cannot be used for `ClockOut`, `BreakStart` or `BreakEnd`.

## Privacy and platform limitation

The website does not receive a fingerprint image, face image or biometric template. A hosted website can require local user verification, but the operating system may permit a configured PIN or passcode fallback. A native application is required when policy must prohibit every non-biometric fallback.

## Railway variables

```text
WebAuthn__RpId=your-production-hostname.example.com
WebAuthn__RpName=HR Attendance Management System
WebAuthn__AllowedOrigins__0=https://your-production-hostname.example.com
```

`WebAuthn__RpId` is a hostname only. `WebAuthn__AllowedOrigins__0` is the exact HTTPS origin. Do not add a trailing slash. Use a stable production alias or custom domain because credentials are scoped to the relying-party ID.

## Employee registration

1. Sign in as an employee on the production phone browser.
2. Open **Profile**.
3. Select **Manage Device Biometrics**.
4. Select **Register This Device**.
5. Complete the phone's verification prompt.
6. Return to the clocking screen.

Registered credentials can be revoked from the same screen.

## Required hosted test

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

Also confirm that cancelling the prompt records nothing, tokens cannot be reused, action-bound tokens cannot be used for another action, unregistered phones are directed to registration, and employees cannot use another employee's credential.
