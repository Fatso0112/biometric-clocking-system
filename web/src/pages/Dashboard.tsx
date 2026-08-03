import {
  AlertCircle,
  Fingerprint,
  FlaskConical,
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
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import { MOCK_BIOMETRIC_ENABLED } from '../config/featureFlags';
import { useSession } from '../context/SessionContext';
import {
  getTodayAttendance,
  recordLiveAttendance,
} from '../services/attendanceApi';
import {
  isBiometricEnrolmentRequired,
  verifyMockBiometric,
} from '../services/biometricVerificationApi';
import {
  getClockingFlowNavigationState,
  getConfirmationPath,
} from '../types/navigation';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    staffNumber,
    employeeId,
    accessToken,
  } = useSession();

  const clockingFlow =
    getClockingFlowNavigationState(
      location.state,
    );

  const [
    resolvedEmployeeNumber,
    setResolvedEmployeeNumber,
  ] = useState<string | null>(
    staffNumber,
  );

  const [isTesting, setIsTesting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!clockingFlow) {
      navigate('/clock', {
        replace: true,
      });
    }
  }, [clockingFlow, navigate]);

  useEffect(() => {
    if (staffNumber) {
      setResolvedEmployeeNumber(
        staffNumber,
      );
      return;
    }

    if (!employeeId || !accessToken) {
      return;
    }

    let active = true;

    void getTodayAttendance(
      employeeId,
      accessToken,
    )
      .then((summary) => {
        if (active) {
          setResolvedEmployeeNumber(
            summary.employeeNumber,
          );
        }
      })
      .catch(() => {
        // The actionable error is displayed if
        // the employee submits the mock flow.
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    employeeId,
    staffNumber,
  ]);

  if (!clockingFlow) {
    return null;
  }

  const scanState = {
    mode: 'verify' as const,
    ...clockingFlow,
  };

  async function handleMockVerification() {
    if (
      !clockingFlow ||
      !employeeId ||
      !accessToken
    ) {
      setErrorMessage(
        'The employee login session is incomplete. Please log in again.',
      );
      return;
    }

    setIsTesting(true);
    setErrorMessage(null);

    try {
      let employeeNumber =
        resolvedEmployeeNumber;

      if (!employeeNumber) {
        const currentSummary =
          await getTodayAttendance(
            employeeId,
            accessToken,
          );

        employeeNumber =
          currentSummary.employeeNumber;

        setResolvedEmployeeNumber(
          employeeNumber,
        );
      }

      const verification =
        await verifyMockBiometric(
          employeeNumber,
          clockingFlow.intendedAction,
          accessToken,
        );

      const attendanceEvent =
        await recordLiveAttendance(
          clockingFlow.intendedAction,
          {
            employeeId,
            verificationToken:
              verification.verificationToken,
            location:
              clockingFlow.locationEvidence,
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
          clockingFlow.intendedAction,
        ),
        {
          replace: true,
          state: {
            intendedAction:
              clockingFlow.intendedAction,
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
            scanType: 'face',
          },
        });
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The attendance event could not be recorded.',
      );
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <AppShell>
      <EmployeeHeader
        staffNumber={
          resolvedEmployeeNumber ??
          staffNumber ??
          '—'
        }
        profileFrom="/clock"
      />

      <Card className="mt-3 p-5">
        <h2 className="text-lg font-semibold">
          Biometric verification
        </h2>

        <p className="mt-1 text-sm text-dark-grey">
          Verify your identity before submitting this attendance action.
        </p>

        {errorMessage ? (
          <NoticeBanner
            className="mt-4"
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

        <div className="mt-6 space-y-4">
          <ListItem
            icon={
              <Fingerprint
                className="h-8 w-8"
                strokeWidth={1.5}
              />
            }
            title="Verify with this device"
            subtitle="Use the phone's face, fingerprint, or secure platform authenticator"
            onClick={() =>
              navigate(
                '/scan/device',
                {
                  state: scanState,
                },
              )
            }
          />

          <NoticeBanner
            className="mt-1"
            icon={
              <ShieldCheck
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            }
          >
            A fresh device verification is required for every attendance action. Biometric templates never leave the phone.
          </NoticeBanner>

          {MOCK_BIOMETRIC_ENABLED ? (
            <div className="border-t border-light-grey pt-4">
              <p className="mb-3 text-xs leading-5 text-dark-grey">
                MVP testing mode: skips the device biometric prompt but still uses the live backend verification, geofence, and attendance APIs.
              </p>

              <Button
                type="button"
                disabled={isTesting}
                onClick={() => {
                  void handleMockVerification();
                }}
              >
                <FlaskConical
                  className="mr-2 h-5 w-5"
                  strokeWidth={1.5}
                />

                {isTesting
                  ? 'SUBMITTING…'
                  : 'CONTINUE WITH MOCK BIOMETRIC'}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
