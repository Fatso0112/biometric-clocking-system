"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEmployeeNumber = normalizeEmployeeNumber;
exports.adaptLegacyStaffNumber = adaptLegacyStaffNumber;
exports.deriveFullName = deriveFullName;
exports.normalizeDepartmentId = normalizeDepartmentId;
exports.normalizeEmployeeStatus = normalizeEmployeeStatus;
exports.adaptEmployeeBoundary = adaptEmployeeBoundary;
exports.adaptAttendanceBoundary = adaptAttendanceBoundary;
function requireNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${fieldName} must be a non-empty string.`);
    }
    return value.trim();
}
function normalizeNullableIsoDateTime(value, fieldName) {
    if (value === null)
        return null;
    const normalized = requireNonEmptyString(value, fieldName);
    if (Number.isNaN(Date.parse(normalized))) {
        throw new TypeError(`${fieldName} must be an ISO date-time string or null.`);
    }
    return normalized;
}
function normalizeEmployeeNumber(value) {
    return requireNonEmptyString(value, 'employeeNumber');
}
function adaptLegacyStaffNumber(staffNumber) {
    return normalizeEmployeeNumber(staffNumber);
}
function deriveFullName(firstName, lastName) {
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}
function normalizeDepartmentId(value) {
    return requireNonEmptyString(value, 'departmentId');
}
function normalizeEmployeeStatus(value) {
    if (value === true || value === 'active')
        return 'active';
    if (value === false || value === 'inactive')
        return 'inactive';
    throw new TypeError('Employee status must be active/inactive or a boolean isActive value.');
}
function adaptEmployeeBoundary(input) {
    const employeeNumberValue = input.employeeNumber ?? input.staffNumber;
    const employeeNumber = normalizeEmployeeNumber(employeeNumberValue);
    if (input.employeeNumber !== undefined &&
        input.staffNumber !== undefined &&
        normalizeEmployeeNumber(input.employeeNumber) !== adaptLegacyStaffNumber(input.staffNumber)) {
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
const ATTENDANCE_STATUSES = [
    'present',
    'absent',
    'late',
    'incomplete',
];
const ATTENDANCE_SOURCES = ['biometric', 'manual', 'imported'];
const VERIFICATION_RESULTS = [
    'verified',
    'failed',
    'not-required',
];
function requireUnionValue(value, allowedValues, fieldName) {
    if (typeof value === 'string' && allowedValues.some((candidate) => candidate === value)) {
        return value;
    }
    throw new TypeError(`${fieldName} has an unsupported value.`);
}
function adaptAttendanceBoundary(value) {
    if (!value || typeof value !== 'object') {
        throw new TypeError('Attendance payload must be an object.');
    }
    const input = value;
    const workDate = requireNonEmptyString(input.workDate, 'workDate');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
        throw new TypeError('workDate must use YYYY-MM-DD format.');
    }
    const durationMinutes = input.durationMinutes;
    if (durationMinutes !== null &&
        (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes) || durationMinutes < 0)) {
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
        verificationResult: requireUnionValue(input.verificationResult, VERIFICATION_RESULTS, 'verificationResult'),
    };
}
