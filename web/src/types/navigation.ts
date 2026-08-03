import type { UserRole } from './session';

export type BiometricScanMode = 'verify' | 'enroll';

export type ProfileOrigin = '/dashboard' | '/clock';
export type BiometricEnrollmentSource = 'profile' | 'registration';
export type BiometricScanType = 'fingerprint' | 'face';
export type IntendedClockAction =
  | 'clockIn'
  | 'breakStart'
  | 'breakEnd'
  | 'clockOut';

export interface ClockingLocationEvidence {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  capturedAtUtc: string;
}

export interface ClockingFlowNavigationState {
  intendedAction: IntendedClockAction;
  locationEvidence: ClockingLocationEvidence;
}

export type BiometricScanNavigationState = {
  mode?: BiometricScanMode;
  enrollmentSource?: BiometricEnrollmentSource;
  from?: ProfileOrigin;
  intendedAction?: IntendedClockAction;
  locationEvidence?: ClockingLocationEvidence;
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

export interface AttendanceConfirmationEvent {
  id: string;
  employeeNumber: string;
  employeeName: string;
  eventType: string;
  capturedAtUtc: string;
  message: string;
}

export interface AttendanceConfirmationSummary {
  status: string;
  workedDurationMinutes: number;
  lunchDurationMinutes: number;
}

export interface AttendanceConfirmationNavigationState {
  intendedAction: IntendedClockAction;
  event: AttendanceConfirmationEvent;
  summary: AttendanceConfirmationSummary;
}

export const REGISTRATION_REQUEST_SUBMITTED_MESSAGE =
  'Your registration request has been submitted.';

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
  if (
    state &&
    typeof state === 'object' &&
    'mode' in state &&
    state.mode === 'enroll'
  ) {
    return 'enroll';
  }

  return 'verify';
}

export function getBiometricEnrollmentSource(
  state: unknown,
): BiometricEnrollmentSource {
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
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    state.from === '/dashboard'
  ) {
    return '/dashboard';
  }

  return '/clock';
}

export function getNotRegisteredScanType(
  state: unknown,
): BiometricScanType {
  if (
    state &&
    typeof state === 'object' &&
    'scanType' in state &&
    state.scanType === 'fingerprint'
  ) {
    return 'fingerprint';
  }

  return 'face';
}

export function getIntendedClockAction(
  state: unknown,
): IntendedClockAction | null {
  if (
    !state ||
    typeof state !== 'object' ||
    !('intendedAction' in state)
  ) {
    return null;
  }

  const action = state.intendedAction;
  return action === 'clockIn' ||
    action === 'breakStart' ||
    action === 'breakEnd' ||
    action === 'clockOut'
    ? action
    : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function getClockingFlowNavigationState(
  state: unknown,
): ClockingFlowNavigationState | null {
  const intendedAction = getIntendedClockAction(state);

  if (
    !intendedAction ||
    !state ||
    typeof state !== 'object' ||
    !('locationEvidence' in state)
  ) {
    return null;
  }

  const evidence = state.locationEvidence;
  if (!evidence || typeof evidence !== 'object') return null;

  if (
    !('latitude' in evidence) ||
    !('longitude' in evidence) ||
    !('accuracyMetres' in evidence) ||
    !('capturedAtUtc' in evidence) ||
    !isFiniteNumber(evidence.latitude) ||
    !isFiniteNumber(evidence.longitude) ||
    !isFiniteNumber(evidence.accuracyMetres) ||
    typeof evidence.capturedAtUtc !== 'string' ||
    evidence.capturedAtUtc.trim() === ''
  ) {
    return null;
  }

  return {
    intendedAction,
    locationEvidence: {
      latitude: evidence.latitude,
      longitude: evidence.longitude,
      accuracyMetres: evidence.accuracyMetres,
      capturedAtUtc: evidence.capturedAtUtc,
    },
  };
}

export function getConfirmationPath(
  action: IntendedClockAction,
): string {
  switch (action) {
    case 'clockIn':
      return '/clock-in-confirmation';
    case 'breakStart':
      return '/break-start-confirmation';
    case 'breakEnd':
      return '/break-end-confirmation';
    case 'clockOut':
      return '/clock-out-confirmation';
  }
}

export function getAttendanceConfirmationState(
  state: unknown,
): AttendanceConfirmationNavigationState | null {
  const intendedAction = getIntendedClockAction(state);

  if (
    !intendedAction ||
    !state ||
    typeof state !== 'object' ||
    !('event' in state) ||
    !('summary' in state)
  ) {
    return null;
  }

  const event = state.event;
  const summary = state.summary;

  if (
    !event ||
    typeof event !== 'object' ||
    !summary ||
    typeof summary !== 'object'
  ) {
    return null;
  }

  if (
    !('id' in event) ||
    !('employeeNumber' in event) ||
    !('employeeName' in event) ||
    !('eventType' in event) ||
    !('capturedAtUtc' in event) ||
    !('message' in event) ||
    typeof event.id !== 'string' ||
    typeof event.employeeNumber !== 'string' ||
    typeof event.employeeName !== 'string' ||
    typeof event.eventType !== 'string' ||
    typeof event.capturedAtUtc !== 'string' ||
    typeof event.message !== 'string'
  ) {
    return null;
  }

  if (
    !('status' in summary) ||
    !('workedDurationMinutes' in summary) ||
    !('lunchDurationMinutes' in summary) ||
    typeof summary.status !== 'string' ||
    !isFiniteNumber(summary.workedDurationMinutes) ||
    !isFiniteNumber(summary.lunchDurationMinutes)
  ) {
    return null;
  }

  return {
    intendedAction,
    event: {
      id: event.id,
      employeeNumber: event.employeeNumber,
      employeeName: event.employeeName,
      eventType: event.eventType,
      capturedAtUtc: event.capturedAtUtc,
      message: event.message,
    },
    summary: {
      status: summary.status,
      workedDurationMinutes: summary.workedDurationMinutes,
      lunchDurationMinutes: summary.lunchDurationMinutes,
    },
  };
}
