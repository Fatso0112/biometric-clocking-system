export const MAX_FINGERPRINT_ATTEMPTS = 3;

export type FingerprintScanStatus =
  | 'idle'
  | 'checkingSupport'
  | 'unsupported'
  | 'ready'
  | 'requestingAuth'
  | 'success'
  | 'userCancelled'
  | 'notRecognised'
  | 'error'
  | 'maxAttemptsReached';

export type FingerprintFailureStatus = 'userCancelled' | 'notRecognised' | 'error';

export interface FingerprintScanState {
  status: FingerprintScanStatus;
  attempts: number;
}

export type FingerprintScanEvent =
  | { type: 'CHECK_SUPPORT' }
  | { type: 'SUPPORT_AVAILABLE' }
  | { type: 'SUPPORT_UNAVAILABLE' }
  | { type: 'REQUEST_AUTH' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILURE'; status: FingerprintFailureStatus; enforceAttemptLimit?: boolean }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export const initialFingerprintScanState: FingerprintScanState = {
  status: 'idle',
  attempts: 0,
};

const retryStatuses = new Set<FingerprintScanStatus>(['userCancelled', 'notRecognised', 'error']);

export function fingerprintScanReducer(
  state: FingerprintScanState,
  event: FingerprintScanEvent,
): FingerprintScanState {
  switch (event.type) {
    case 'CHECK_SUPPORT':
      return { ...state, status: 'checkingSupport' };
    case 'SUPPORT_AVAILABLE':
      return state.status === 'checkingSupport' ? { ...state, status: 'ready' } : state;
    case 'SUPPORT_UNAVAILABLE':
      return state.status === 'checkingSupport' ? { ...state, status: 'unsupported' } : state;
    case 'REQUEST_AUTH':
      return state.status === 'ready' ? { ...state, status: 'requestingAuth' } : state;
    case 'AUTH_SUCCESS':
      return state.status === 'requestingAuth' ? { ...state, status: 'success' } : state;
    case 'AUTH_FAILURE': {
      if (state.status !== 'requestingAuth') return state;
      const enforceAttemptLimit = event.enforceAttemptLimit !== false;
      const attempts = enforceAttemptLimit ? state.attempts + 1 : state.attempts;

      return {
        ...state,
        attempts,
        status: enforceAttemptLimit && attempts >= MAX_FINGERPRINT_ATTEMPTS ? 'maxAttemptsReached' : event.status,
      };
    }
    case 'RETRY':
      return retryStatuses.has(state.status) ? { ...state, status: 'ready' } : state;
    case 'RESET':
      return initialFingerprintScanState;
    default:
      return state;
  }
}
