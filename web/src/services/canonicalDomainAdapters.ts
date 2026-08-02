import type {
  AttendanceSource,
  AttendanceStatus,
  AttendanceVerificationResult,
  CanonicalAttendance,
  CanonicalEmployee,
  EmployeeStatus,
} from '../types/canonicalDomain';

export interface EmployeeBoundaryInput {
  employeeNumber?: unknown;
  staffNumber?: unknown;
  firstName: unknown;
  lastName: unknown;
  departmentId: unknown;
  status?: unknown;
  isActive?: unknown;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeNullableIsoDateTime(value: unknown, fieldName: string): string | null {
  if (value === null) return null;
  const normalized = requireNonEmptyString(value, fieldName);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new TypeError(`${fieldName} must be an ISO date-time string or null.`);
  }
  return normalized;
}

export function normalizeEmployeeNumber(value: unknown): string {
  return requireNonEmptyString(value, 'employeeNumber');
}

export function adaptLegacyStaffNumber(staffNumber: unknown): string {
  return normalizeEmployeeNumber(staffNumber);
}

export function deriveFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

export function normalizeDepartmentId(value: unknown): string {
  return requireNonEmptyString(value, 'departmentId');
}

export function normalizeEmployeeStatus(value: unknown): EmployeeStatus {
  if (value === true || value === 'active') return 'active';
  if (value === false || value === 'inactive') return 'inactive';
  throw new TypeError('Employee status must be active/inactive or a boolean isActive value.');
}

export function adaptEmployeeBoundary(input: EmployeeBoundaryInput): CanonicalEmployee {
  const employeeNumberValue = input.employeeNumber ?? input.staffNumber;
  const employeeNumber = normalizeEmployeeNumber(employeeNumberValue);

  if (
    input.employeeNumber !== undefined &&
    input.staffNumber !== undefined &&
    normalizeEmployeeNumber(input.employeeNumber) !== adaptLegacyStaffNumber(input.staffNumber)
  ) {
    throw new TypeError('employeeNumber and staffNumber identify different employees.');
  }

  return {
    employeeNumber,
    firstName: requireNonEmptyString(input.firstName, 'firstName'),
    lastName: requireNonEmptyString(input.lastName, 'lastName'),
    departmentId: normalizeDepartmentId(input.departmentId),
    status: normalizeEmployeeStatus(input.status ?? input.isActive),
  };
}

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'incomplete',
];
const ATTENDANCE_SOURCES: readonly AttendanceSource[] = ['biometric', 'manual', 'imported'];
const VERIFICATION_RESULTS: readonly AttendanceVerificationResult[] = [
  'verified',
  'failed',
  'not-required',
];

function requireUnionValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): T {
  if (typeof value === 'string' && allowedValues.some((candidate) => candidate === value)) {
    return value as T;
  }
  throw new TypeError(`${fieldName} has an unsupported value.`);
}

export function adaptAttendanceBoundary(value: unknown): CanonicalAttendance {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Attendance payload must be an object.');
  }

  const input = value as Partial<Record<keyof CanonicalAttendance, unknown>>;
  const workDate = requireNonEmptyString(input.workDate, 'workDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new TypeError('workDate must use YYYY-MM-DD format.');
  }

  const durationMinutes = input.durationMinutes;
  if (
    durationMinutes !== null &&
    (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes) || durationMinutes < 0)
  ) {
    throw new TypeError('durationMinutes must be a non-negative number or null.');
  }

  return {
    id: requireNonEmptyString(input.id, 'id'),
    employeeId: requireNonEmptyString(input.employeeId, 'employeeId'),
    employeeNumber: normalizeEmployeeNumber(input.employeeNumber),
    workDate,
    clockIn: normalizeNullableIsoDateTime(input.clockIn, 'clockIn'),
    clockOut: normalizeNullableIsoDateTime(input.clockOut, 'clockOut'),
    status: requireUnionValue(input.status, ATTENDANCE_STATUSES, 'status'),
    durationMinutes,
    source: requireUnionValue(input.source, ATTENDANCE_SOURCES, 'source'),
    verificationResult: requireUnionValue(
      input.verificationResult,
      VERIFICATION_RESULTS,
      'verificationResult',
    ),
  };
}
