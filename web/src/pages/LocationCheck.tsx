import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import {
  getIntendedClockAction,
  type ClockingLocationEvidence,
} from '../types/navigation';

type LocationStatus =
  | 'checking'
  | 'permissionDenied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'captured';

type LocationPresentation = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  icon: LucideIcon;
};

function getPresentation(status: LocationStatus): LocationPresentation {
  switch (status) {
    case 'permissionDenied':
      return {
        heading: 'Browser Location Permission Needed',
        subtext:
          'Allow location access for this site in your browser settings, then try again.',
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'timeout':
      return {
        heading: 'Location Timed Out',
        subtext: 'Your location took too long to load. Try again.',
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'unavailable':
      return {
        heading: 'Location Unavailable',
        subtext: "We couldn't determine your location. Try again.",
        buttonLabel: 'TRY AGAIN',
        icon: AlertCircle,
      };
    case 'unsupported':
      return {
        heading: 'Location Not Available',
        subtext: "This browser doesn't support location services.",
        buttonLabel: 'LOCATION UNAVAILABLE',
        icon: AlertCircle,
      };
    case 'captured':
      return {
        heading: 'Location Captured',
        subtext: 'Your location evidence was captured. Continuing to biometric verification…',
        buttonLabel: 'LOCATION CAPTURED',
        icon: CheckCircle2,
      };
    default:
      return {
        heading: 'Checking Your Location',
        subtext: 'Please wait while your device captures its current location.',
        buttonLabel: 'CHECKING…',
        icon: MapPin,
      };
  }
}

function getCapturedAtUtc(position: GeolocationPosition): string {
  const capturedAt = new Date(position.timestamp);
  return Number.isNaN(capturedAt.getTime())
    ? new Date().toISOString()
    : capturedAt.toISOString();
}

export default function LocationCheck() {
  const location = useLocation();
  const navigate = useNavigate();
  const intendedAction = getIntendedClockAction(location.state);
  const [status, setStatus] = useState<LocationStatus>('checking');
  const [evidence, setEvidence] =
    useState<ClockingLocationEvidence | null>(null);
  const presentation = getPresentation(status);
  const StatusIcon = presentation.icon;
  const canRetry =
    status === 'permissionDenied' ||
    status === 'unavailable' ||
    status === 'timeout';

  useEffect(() => {
    if (!intendedAction) {
      navigate('/clock', { replace: true });
    }
  }, [intendedAction, navigate]);

  useEffect(() => {
    if (status !== 'checking' || !intendedAction) return;

    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    let active = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;

        setEvidence({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMetres: position.coords.accuracy,
          capturedAtUtc: getCapturedAtUtc(position),
        });
        setStatus('captured');
      },
      (error) => {
        if (!active) return;

        if (error.code === error.PERMISSION_DENIED) {
          setStatus('permissionDenied');
        } else if (error.code === error.TIMEOUT) {
          setStatus('timeout');
        } else {
          setStatus('unavailable');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15_000,
      },
    );

    return () => {
      active = false;
    };
  }, [intendedAction, status]);

  useEffect(() => {
    if (status !== 'captured' || !intendedAction || !evidence) return;

    const timer = window.setTimeout(() => {
      navigate('/dashboard', {
        replace: true,
        state: {
          intendedAction,
          locationEvidence: evidence,
        },
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [evidence, intendedAction, navigate, status]);

  if (!intendedAction) return null;

  const isError =
    status === 'permissionDenied' ||
    status === 'unavailable' ||
    status === 'timeout' ||
    status === 'unsupported';

  return (
    <AppShell className="justify-center py-6">
      <ScreenHeader title="Location Check" backTo="/clock" />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ${
            status === 'captured'
              ? 'bg-status-green-soft text-status-green'
              : isError
                ? 'bg-status-red-soft text-status-red'
                : 'bg-light-grey/60 text-black'
          } ${status === 'checking' ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        >
          <StatusIcon className="h-12 w-12" strokeWidth={1.5} />
        </div>

        <div className="mt-7" aria-live="polite" aria-atomic="true">
          <h1 className="text-2xl font-bold leading-tight">
            {presentation.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-[330px] text-sm leading-relaxed text-dark-grey">
            {presentation.subtext}
          </p>
        </div>

        <Button
          onClick={() => {
            setEvidence(null);
            setStatus('checking');
          }}
          disabled={!canRetry}
          aria-busy={status === 'checking'}
          className="mt-10 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none disabled:hover:opacity-100"
        >
          {presentation.buttonLabel}
        </Button>
      </div>
    </AppShell>
  );
}
