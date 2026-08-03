import { ApiError, apiRequest } from './httpClient';

export type BiometricModality = 'Face' | 'Fingerprint';

export interface BiometricEnrolmentResponse {
  id: string;
  biometricProfileId: string;
  modality: BiometricModality;
  providerName: string;
  externalReference: string;
  label: string | null;
  status: 'Active' | 'Disabled' | 'Revoked';
  qualityScore: number | null;
  createdByUserId: string | null;
  enrolledAtUtc: string;
  disabledAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface BiometricProfileResponse {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  isActive: boolean;
  activeEnrolmentCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  enrolments: BiometricEnrolmentResponse[];
}

export async function getBiometricProfile(
  employeeId: string,
  accessToken: string,
): Promise<BiometricProfileResponse | null> {
  try {
    return await apiRequest<BiometricProfileResponse>(
      `/api/v1/employees/${encodeURIComponent(employeeId)}/biometric-profile`,
      { method: 'GET' },
      accessToken,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.errorCode === 'BIOMETRIC_PROFILE_NOT_FOUND'
    ) {
      return null;
    }

    throw error;
  }
}

export async function createMockBiometricEnrolment(
  employeeId: string,
  modality: BiometricModality,
  accessToken: string,
): Promise<BiometricEnrolmentResponse> {
  return apiRequest<BiometricEnrolmentResponse>(
    '/api/v1/biometric-enrolments/mock',
    {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        modality,
        label: 'Hosted MVP mock enrolment',
      }),
    },
    accessToken,
  );
}
