import { AlertCircle, CheckCircle2, MapPin, type LucideIcon } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import type { OfficeGeofence } from '../config/geofence';
import { useSession } from '../context/SessionContext';
import { getActiveOfficeGeofence } from '../services/geofenceApi';
import {
  initialLocationCheckState,
  locationCheckReducer,
  type LocationCheckState,
  type LocationCheckStatus,
} from '../state/locationCheckMachine';
import { getIntendedClockAction } from '../types/navigation';
import { isWithinGeofence } from '../utils/geofence';

type LocationPresentation = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  icon: LucideIcon;
};

const retryStatuses = new Set<LocationCheckStatus>([
  'permissionDenied',
  'positionUnavailable',
  'timeout',
  'outsideZone',
]);

function getPresentation(state: LocationCheckState): LocationPresentation {
  switch (state.status) {
    case 'unsupported':
      return {
        heading: 'Location Not Available',
        subtext: "This device doesn't support location services.",
        buttonLabel: 'LOCATION UNAVAILABLE',
        icon: AlertCircle,
      };
    case 'permissionDenied':
      return {
        heading: 'Browser Location Permission Needed',
        subtext:
          'Your device location may be on, but this site is blocked. Allow location access for this site in your browser settings.',
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'positionUnavailable':
    case 'timeout':
      return {
        heading: 'Location Unavailable',
        subtext: "We couldn't determine your location. Try again.",
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'outsideZone':
      return {
        heading: 'Outside Required Radius',
        subtext: "You're not within the required radius to use this service.",
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'withinZone':
      return {
        heading: 'Location Verified',
        subtext: "You're within range — continuing…",
        buttonLabel: 'LOCATION VERIFIED',
        icon: CheckCircle2,
      };
    default:
      return {
        heading: 'Checking Your Location',
        subtext: 'Please wait while we verify your location.',
        buttonLabel: 'CHECKING…',
        icon: MapPin,
      };
  }
}

function mapPositionError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'permissionDenied' as const;
  if (error.code === error.TIMEOUT) return 'timeout' as const;
  return 'positionUnavailable' as const;
}

export default function LocationCheck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { staffNumber } = useSession();
  const intendedAction = getIntendedClockAction(location.state);
  const [state, dispatch] = useReducer(locationCheckReducer, initialLocationCheckState);
  const [activeGeofence, setActiveGeofence] = useState<OfficeGeofence | null>(null);
  const presentation = getPresentation(state);
  const StatusIcon = presentation.icon;
  const canRetry = retryStatuses.has(state.status);
  const isWithinZone = state.status === 'withinZone';
  const isError =
    state.status === 'unsupported' ||
    state.status === 'permissionDenied' ||
    state.status === 'positionUnavailable' ||
    state.status === 'timeout' ||
    state.status === 'outsideZone';

  useEffect(() => {
    if (!intendedAction) {
      navigate('/clock', { replace: true });
      return;
    }

    dispatch({ type: 'CHECK_SUPPORT' });
  }, [intendedAction, navigate]);

  useEffect(() => {
    if (state.status !== 'checkingSupport') return;

    if (!navigator.geolocation) {
      dispatch({ type: 'UNSUPPORTED' });
      return;
    }

    if (!staffNumber || !intendedAction) return;

    let active = true;
    setActiveGeofence(null);

    void getActiveOfficeGeofence({ staffNumber, intendedAction })
      .then((geofence) => {
        if (!active) return;
        setActiveGeofence(geofence);
        dispatch({ type: 'REQUEST_LOCATION' });
      })
      .catch(() => {
        if (active) dispatch({ type: 'GEOFENCE_UNAVAILABLE' });
      });

    return () => {
      active = false;
    };
  }, [intendedAction, staffNumber, state.status]);

  useEffect(() => {
    if (state.status !== 'requesting') return;

    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        dispatch({
          type: 'POSITION_RESOLVED',
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => {
        if (active) dispatch({ type: 'POSITION_REJECTED', status: mapPositionError(error) });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );

    return () => {
      active = false;
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'resolved' || !state.position || !activeGeofence) return;
    dispatch({
      type: 'ZONE_EVALUATED',
      withinZone: isWithinGeofence(state.position, activeGeofence),
    });
  }, [activeGeofence, state.position, state.status]);

  useEffect(() => {
    if (state.status !== 'withinZone' || !intendedAction) return;

    const redirectTimer = window.setTimeout(() => {
      navigate(intendedAction === 'clockIn' ? '/dashboard' : '/clock-out-confirmation', {
        replace: true,
      });
    }, 1200);

    return () => window.clearTimeout(redirectTimer);
  }, [intendedAction, navigate, state.status]);

  if (!intendedAction) return null;

  const iconClasses = isWithinZone
    ? 'bg-status-green-soft text-status-green'
    : isError
      ? 'bg-status-red-soft text-status-red'
      : 'bg-light-grey/60 text-black';

  return (
    <AppShell className="justify-center py-6">
      <ScreenHeader title="Location Check" backTo="/clock" />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ${iconClasses} ${
            state.status === 'requesting' ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        >
          <StatusIcon className="h-12 w-12" strokeWidth={1.5} />
        </div>

        <div className="mt-7" aria-live="polite" aria-atomic="true">
          <h1 className="text-2xl font-bold leading-tight">{presentation.heading}</h1>
          <p className="mx-auto mt-3 max-w-[330px] text-sm leading-relaxed text-dark-grey">
            {presentation.subtext}
          </p>
        </div>

        <Button
          onClick={() => dispatch({ type: 'RETRY' })}
          disabled={!canRetry}
          aria-busy={state.status === 'checkingSupport' || state.status === 'requesting' || state.status === 'resolved'}
          className="mt-10 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none disabled:hover:opacity-100"
        >
          {presentation.buttonLabel}
        </Button>
      </div>
    </AppShell>
  );
}
