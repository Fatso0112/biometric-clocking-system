import { ApiError, apiRequest } from './httpClient';

export interface BiometricVerificationResponse {
  sessionId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  verificationToken: string;
  confidence: number | null;
  expiresAtUtc: string;
  isMock: boolean;
  message: string;
}

const ENROLMENT_REQUIRED_ERROR_CODES = new Set([
  'BIOMETRIC_NOT_ENROLLED',
  'FACE_NOT_ENROLLED',
  'FINGERPRINT_NOT_ENROLLED',
  'BIOMETRIC_PROFILE_NOT_ENROLLED',
  'BIOMETRIC_PROFILE_DISABLED',
  'DEVICE_BIOMETRIC_NOT_ENROLLED',
]);

export function isBiometricEnrolmentRequired(
  error: unknown,
): boolean {
  return (
    error instanceof ApiError &&
    Boolean(
      error.errorCode &&
        ENROLMENT_REQUIRED_ERROR_CODES.has(
          error.errorCode,
        ),
    )
  );
}

export async function verifyMockBiometric(
  employeeNumber: string,
  attendanceAction: string,
  accessToken: string,
): Promise<BiometricVerificationResponse> {
  return apiRequest<BiometricVerificationResponse>(
    '/api/v1/biometric-verifications/mock',
    {
      method: 'POST',
      body: JSON.stringify({
        employeeNumber: employeeNumber.trim(),
        attendanceAction,
      }),
    },
    accessToken,
  );
}
