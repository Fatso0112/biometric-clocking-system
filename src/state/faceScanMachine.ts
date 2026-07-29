export const MAX_VERIFICATION_ATTEMPTS = 3;

export type FaceScanStatus =
  | 'idle'
  | 'requestingPermission'
  | 'cameraActive'
  | 'permissionDenied'
  | 'unsupported'
  | 'faceMisaligned'
  | 'faceAligned'
  | 'capturing'
  | 'sending'
  | 'success'
  | 'notRecognised'
  | 'networkError'
  | 'timeout'
  | 'maxAttemptsReached';

export type VerificationFailureStatus = 'notRecognised' | 'networkError' | 'timeout';

export interface FaceScanState {
  status: FaceScanStatus;
  attempts: number;
  guidance: string;
}

export type FaceScanEvent =
  | { type: 'REQUEST_CAMERA' }
  | { type: 'CAMERA_GRANTED' }
  | { type: 'CAMERA_DENIED' }
  | { type: 'CAMERA_UNSUPPORTED'; guidance: string }
  | { type: 'DETECTION_UPDATED'; faceDetected: boolean; aligned: boolean; guidance: string }
  | { type: 'CAPTURE' }
  | { type: 'SEND' }
  | { type: 'VERIFY_SUCCESS' }
  | { type: 'VERIFY_FAILURE'; status: VerificationFailureStatus }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export const DEFAULT_FACE_GUIDANCE = 'Make sure your face is clearly visible';

export const initialFaceScanState: FaceScanState = {
  status: 'idle',
  attempts: 0,
  guidance: DEFAULT_FACE_GUIDANCE,
};

const detectionStatuses = new Set<FaceScanStatus>(['cameraActive', 'faceMisaligned', 'faceAligned']);
const retryStatuses = new Set<FaceScanStatus>(['notRecognised', 'networkError', 'timeout']);

export function faceScanReducer(state: FaceScanState, event: FaceScanEvent): FaceScanState {
  switch (event.type) {
    case 'REQUEST_CAMERA':
      return { ...state, status: 'requestingPermission', guidance: 'Requesting camera access…' };
    case 'CAMERA_GRANTED':
      return { ...state, status: 'cameraActive', guidance: DEFAULT_FACE_GUIDANCE };
    case 'CAMERA_DENIED':
      return {
        ...state,
        status: 'permissionDenied',
        guidance: 'Please allow camera access in your browser settings to continue.',
      };
    case 'CAMERA_UNSUPPORTED':
      return { ...state, status: 'unsupported', guidance: event.guidance };
    case 'DETECTION_UPDATED':
      if (!detectionStatuses.has(state.status)) return state;
      if (event.aligned) return { ...state, status: 'faceAligned', guidance: event.guidance };
      return {
        ...state,
        status: event.faceDetected ? 'faceMisaligned' : 'cameraActive',
        guidance: event.guidance,
      };
    case 'CAPTURE':
      return state.status === 'faceAligned' ? { ...state, status: 'capturing' } : state;
    case 'SEND':
      return state.status === 'capturing' ? { ...state, status: 'sending' } : state;
    case 'VERIFY_SUCCESS':
      return state.status === 'sending' ? { ...state, status: 'success' } : state;
    case 'VERIFY_FAILURE': {
      if (state.status !== 'sending') return state;
      const attempts = state.attempts + 1;
      return {
        ...state,
        attempts,
        status: attempts >= MAX_VERIFICATION_ATTEMPTS ? 'maxAttemptsReached' : event.status,
      };
    }
    case 'RETRY':
      return retryStatuses.has(state.status)
        ? { ...state, status: 'cameraActive', guidance: DEFAULT_FACE_GUIDANCE }
        : state;
    case 'RESET':
      return initialFaceScanState;
    default:
      return state;
  }
}
