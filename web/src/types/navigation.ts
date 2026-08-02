import type { UserRole } from './session';

export type BiometricScanMode = 'verify' | 'enroll';

export type ProfileOrigin = '/dashboard' | '/clock';
export type BiometricEnrollmentSource = 'profile' | 'registration';
export type BiometricScanType = 'fingerprint' | 'face';
export type IntendedClockAction = 'clockIn' | 'clockOut';

export type BiometricScanNavigationState = {
  mode?: BiometricScanMode;
  enrollmentSource?: BiometricEnrollmentSource;
  from?: ProfileOrigin;
};

export type ProfileNavigationState = {
  biometricUpdateMessage?: string;
  from?: ProfileOrigin;
};

export type NotRegisteredNavigationState = {
  scanType?: BiometricScanType;
};

export type LoginNavigationState = {
  noticeMessage?: string;
};

export type LocationCheckNavigationState = {
  intendedAction?: IntendedClockAction;
};

export const REGISTRATION_REQUEST_SUBMITTED_MESSAGE = 'Your registration request has been submitted.';

export type RoleHomePath =
  | '/clock'
  | '/supervisor/dashboard'
  | '/hr/dashboard'
  | '/admin/dashboard';

export function getRoleHomePath(role: UserRole): RoleHomePath {
  switch (role) {
    case 'employee':
      return '/clock';
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'hr':
      return '/hr/dashboard';
    case 'admin':
      return '/admin/dashboard';
  }
}

export function getBiometricScanMode(state: unknown): BiometricScanMode {
  if (state && typeof state === 'object' && 'mode' in state && state.mode === 'enroll') return 'enroll';
  return 'verify';
}

export function getBiometricEnrollmentSource(state: unknown): BiometricEnrollmentSource {
  if (
    state &&
    typeof state === 'object' &&
    'enrollmentSource' in state &&
    state.enrollmentSource === 'registration'
  ) {
    return 'registration';
  }

  return 'profile';
}

export function getProfileOrigin(state: unknown): ProfileOrigin {
  if (state && typeof state === 'object' && 'from' in state && state.from === '/dashboard') {
    return '/dashboard';
  }

  return '/clock';
}

export function getNotRegisteredScanType(state: unknown): BiometricScanType {
  if (state && typeof state === 'object' && 'scanType' in state && state.scanType === 'fingerprint') {
    return 'fingerprint';
  }

  return 'face';
}

export function getIntendedClockAction(state: unknown): IntendedClockAction | null {
  if (!state || typeof state !== 'object' || !('intendedAction' in state)) return null;
  if (state.intendedAction === 'clockIn' || state.intendedAction === 'clockOut') {
    return state.intendedAction;
  }

  return null;
}
