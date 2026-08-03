import {
  AlertCircle,
  Fingerprint,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import SecurityFooter from '../components/SecurityFooter';
import { useSession } from '../context/SessionContext';
import {
  getTodayAttendance,
  recordLiveAttendance,
} from '../services/attendanceApi';
import {
  isBiometricEnrolmentRequired,
} from '../services/biometricVerificationApi';
import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  verifyDeviceForAttendance,
} from '../services/webauthnApi';
import {
  getClockingFlowNavigationState,
  getConfirmationPath,
  type IntendedClockAction,
} from '../types/navigation';

function getActionLabel(
  action: IntendedClockAction,
): string {
  switch (action) {
    case 'clockIn':
      return 'CLOCK IN';
    case 'breakStart':
      return 'START BREAK';
    case 'breakEnd':
      return 'END BREAK';
    case 'clockOut':
      return 'CLOCK OUT';
  }
}

function getErrorMessage(error: unknown): string {
  if (
    error instanceof DOMException &&
    error.name === 'NotAllowedError'
  ) {
    return 'Device verification was cancelled or timed out. Try again.';
  }

  if (
    error instanceof DOMException &&
    error.name === 'SecurityError'
  ) {
    return 'Device verification is not configured for this website domain.';
  }

  return error instanceof Error
    ? error.message
    : 'Device verification could not be completed.';
}

export default function DeviceBiometric() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId, accessToken } = useSession();

  const clockingFlow =
    getClockingFlowNavigationState(
      location.state,
    );

  const [isChecking, setIsChecking] =
    useState(true);

  const [isAvailable, setIsAvailable] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!clockingFlow) {
      navigate('/clock', {
        replace: true,
      });
      return;
    }

    let active = true;

    if (!isWebAuthnSupported()) {
      setIsChecking(false);
      setIsAvailable(false);
      return;
    }

    void isPlatformAuthenticatorAvailable()
      .then((available) => {
        if (active) {
          setIsAvailable(available);
        }
      })
      .catch(() => {
        if (active) {
          setIsAvailable(false);
        }
      })
      .finally(() => {
        if (active) {
          setIsChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clockingFlow, navigate]);

  if (!clockingFlow) return null;

    const activeFlow = clockingFlow;

    async function handleVerification() {
      if (!employeeId || !accessToken) {
        setErrorMessage(
          'The employee login session is incomplete. Please log in again.',
        );
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const verification =
          await verifyDeviceForAttendance(
            activeFlow.intendedAction,
            accessToken,
          );

        const attendanceEvent =
          await recordLiveAttendance(
            activeFlow.intendedAction,
            {
              employeeId,
              verificationToken:
                verification.verificationToken,
              location:
                activeFlow.locationEvidence,
            },
            accessToken,
          );

        const summary =
          await getTodayAttendance(
            employeeId,
            accessToken,
          );

        navigate(
          getConfirmationPath(
            activeFlow.intendedAction,
          ),
          {
            replace: true,
            state: {
              intendedAction:
                activeFlow.intendedAction,
              event: attendanceEvent,
              summary,
            },
          },
        );
      } catch (error) {
        if (isBiometricEnrolmentRequired(error)) {
          navigate('/not-registered', {
            replace: true,
            state: {
              scanType: 'fingerprint',
            },
          });
          return;
        }

        setErrorMessage(
          getErrorMessage(error),
        );
      } finally {
        setIsSubmitting(false);
      }
    }

  return (
    <AppShell>
      <ScreenHeader
        title="Device Verification"
        backTo="/dashboard"
        backState={clockingFlow}
      />

      <Card className="mt-6 p-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-light-grey">
          {isSubmitting || isChecking ? (
            <LoaderCircle
              className="h-12 w-12 animate-spin"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ) : (
            <Fingerprint
              className="h-12 w-12"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </div>

        <h1 className="mt-5 text-xl font-bold">
          Verify this attendance action
        </h1>

        <p className="mt-3 text-sm leading-6 text-dark-grey">
          Your phone will request its configured face,
          fingerprint, or secure device verification.
          The biometric data stays on the phone.
        </p>

        {errorMessage ? (
          <NoticeBanner
            className="mt-5 text-left"
            role="alert"
            icon={
              <AlertCircle
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            }
          >
            {errorMessage}
          </NoticeBanner>
        ) : null}

        {!isChecking && !isAvailable ? (
          <NoticeBanner
            className="mt-5 text-left"
            role="alert"
            icon={
              <AlertCircle
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            }
          >
            This browser does not expose a user-verifying
            platform authenticator. Open the hosted site in
            the phone&apos;s current Chrome, Safari, or Edge
            browser and make sure a screen lock is configured.
          </NoticeBanner>
        ) : null}

        <Button
          type="button"
          className="mt-6 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey"
          disabled={
            isChecking ||
            !isAvailable ||
            isSubmitting
          }
          onClick={() => {
            void handleVerification();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <ShieldCheck
              className="h-5 w-5"
              strokeWidth={1.5}
              aria-hidden="true"
            />

            {isSubmitting
              ? 'VERIFYING…'
              : `VERIFY AND ${getActionLabel(
                  clockingFlow.intendedAction,
                )}`}
          </span>
        </Button>
      </Card>

      <div className="mt-auto pt-8">
        <SecurityFooter />
      </div>
    </AppShell>
  );
}
