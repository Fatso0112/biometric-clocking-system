"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRATION_REQUEST_SUBMITTED_MESSAGE = void 0;
exports.getRoleHomePath = getRoleHomePath;
exports.getBiometricScanMode = getBiometricScanMode;
exports.getBiometricEnrollmentSource = getBiometricEnrollmentSource;
exports.getProfileOrigin = getProfileOrigin;
exports.getNotRegisteredScanType = getNotRegisteredScanType;
exports.getIntendedClockAction = getIntendedClockAction;
exports.REGISTRATION_REQUEST_SUBMITTED_MESSAGE = 'Your registration request has been submitted.';
function getRoleHomePath(role) {
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
function getBiometricScanMode(state) {
    if (state && typeof state === 'object' && 'mode' in state && state.mode === 'enroll')
        return 'enroll';
    return 'verify';
}
function getBiometricEnrollmentSource(state) {
    if (state &&
        typeof state === 'object' &&
        'enrollmentSource' in state &&
        state.enrollmentSource === 'registration') {
        return 'registration';
    }
    return 'profile';
}
function getProfileOrigin(state) {
    if (state && typeof state === 'object' && 'from' in state && state.from === '/dashboard') {
        return '/dashboard';
    }
    return '/clock';
}
function getNotRegisteredScanType(state) {
    if (state && typeof state === 'object' && 'scanType' in state && state.scanType === 'fingerprint') {
        return 'fingerprint';
    }
    return 'face';
}
function getIntendedClockAction(state) {
    if (!state || typeof state !== 'object' || !('intendedAction' in state))
        return null;
    if (state.intendedAction === 'clockIn' || state.intendedAction === 'clockOut') {
        return state.intendedAction;
    }
    return null;
}
