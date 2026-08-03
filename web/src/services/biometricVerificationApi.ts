import { ApiError } from './httpClient';

const ENROLMENT_REQUIRED_ERROR_CODES = new Set([
  'DEVICE_BIOMETRIC_NOT_ENROLLED',
  'WEBAUTHN_CREDENTIAL_UNKNOWN',
  'WEBAUTHN_CREDENTIAL_REQUIRED',
]);

export function isBiometricEnrolmentRequired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    Boolean(
      error.errorCode &&
      ENROLMENT_REQUIRED_ERROR_CODES.has(error.errorCode),
    )
  );
}
