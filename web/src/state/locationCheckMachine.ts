import type { GeographicPoint } from '../utils/geofence';

export type LocationCheckStatus =
  | 'idle'
  | 'checkingSupport'
  | 'requesting'
  | 'resolved'
  | 'permissionDenied'
  | 'unsupported'
  | 'positionUnavailable'
  | 'timeout'
  | 'withinZone'
  | 'outsideZone';

export type LocationCheckState = {
  status: LocationCheckStatus;
  position: GeographicPoint | null;
};

export type LocationCheckEvent =
  | { type: 'CHECK_SUPPORT' }
  | { type: 'REQUEST_LOCATION' }
  | { type: 'UNSUPPORTED' }
  | { type: 'GEOFENCE_UNAVAILABLE' }
  | { type: 'POSITION_RESOLVED'; position: GeographicPoint }
  | { type: 'POSITION_REJECTED'; status: 'permissionDenied' | 'positionUnavailable' | 'timeout' }
  | { type: 'ZONE_EVALUATED'; withinZone: boolean }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export const initialLocationCheckState: LocationCheckState = {
  status: 'idle',
  position: null,
};

const retryStatuses = new Set<LocationCheckStatus>([
  'permissionDenied',
  'positionUnavailable',
  'timeout',
  'outsideZone',
]);

export function locationCheckReducer(
  state: LocationCheckState,
  event: LocationCheckEvent,
): LocationCheckState {
  switch (event.type) {
    case 'CHECK_SUPPORT':
      return state.status === 'idle' ? { ...state, status: 'checkingSupport' } : state;
    case 'REQUEST_LOCATION':
      return state.status === 'checkingSupport' ? { ...state, status: 'requesting' } : state;
    case 'UNSUPPORTED':
      return state.status === 'checkingSupport' ? { ...state, status: 'unsupported' } : state;
    case 'GEOFENCE_UNAVAILABLE':
      return state.status === 'checkingSupport' ? { ...state, status: 'positionUnavailable' } : state;
    case 'POSITION_RESOLVED':
      return state.status === 'requesting'
        ? { status: 'resolved', position: event.position }
        : state;
    case 'POSITION_REJECTED':
      return state.status === 'requesting' ? { ...state, status: event.status } : state;
    case 'ZONE_EVALUATED':
      return state.status === 'resolved'
        ? { ...state, status: event.withinZone ? 'withinZone' : 'outsideZone' }
        : state;
    case 'RETRY':
      return retryStatuses.has(state.status)
        ? { status: 'checkingSupport', position: null }
        : state;
    case 'RESET':
      return initialLocationCheckState;
    default:
      return state;
  }
}
