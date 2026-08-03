import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  Loader2,
  ScanFace,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import SecurityFooter from '../components/SecurityFooter';
import { CameraAccessError, useCamera } from '../hooks/useCamera';
import { useSession } from '../context/SessionContext';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useLogout } from '../hooks/useLogout';
import { getTodayAttendance, recordLiveAttendance } from '../services/attendanceApi';
import {
  isBiometricEnrolmentRequired,
  verifyMockBiometric,
} from '../services/biometricVerificationApi';
import { registerFace, verifyFace } from '../services/faceRecognitionApi';
import {
  faceScanReducer,
  initialFaceScanState,
  type FaceScanState,
  type FaceScanStatus,
  type VerificationFailureStatus,
} from '../state/faceScanMachine';
import {
  getBiometricEnrollmentSource,
  getBiometricScanMode,
  getClockingFlowNavigationState,
  getConfirmationPath,
  getProfileOrigin,
  REGISTRATION_REQUEST_SUBMITTED_MESSAGE,
} from '../types/navigation';

type FaceScanPresentation = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  icon: LucideIcon;
  iconSpins?: boolean;
};

const retryStatuses = new Set<FaceScanStatus>(['notRecognised', 'networkError', 'timeout']);
const detectionEnabledStatuses = new Set<FaceScanStatus>([
  'cameraActive',
  'faceMisaligned',
  'faceAligned',
  'capturing',
  'sending',
  'notRecognised',
  'networkError',
  'timeout',
]);
const liveVideoStatuses = new Set<FaceScanStatus>([
  'cameraActive',
  'faceMisaligned',
  'faceAligned',
  'capturing',
  'sending',
  'notRecognised',
  'networkError',
  'timeout',
]);

function getPresentation(state: FaceScanState): FaceScanPresentation {
  switch (state.status) {
    case 'requestingPermission':
      return {
        heading: 'Face Recognition',
        subtext: 'Requesting camera access…',
        buttonLabel: 'SCAN FACE',
        icon: Loader2,
        iconSpins: true,
      };
    case 'permissionDenied':
      return {
        heading: 'Camera Access Needed',
        subtext: 'Please allow camera access in your browser settings to continue.',
        buttonLabel: 'SCAN FACE',
        icon: CameraOff,
      };
    case 'unsupported':
      return {
        heading: 'Camera Not Available',
        subtext: state.guidance,
        buttonLabel: 'SCAN FACE',
        icon: CameraOff,
      };
    case 'capturing':
    case 'sending':
      return {
        heading: 'Scanning…',
        subtext: 'Please hold still',
        buttonLabel: 'Scanning…',
        icon: Loader2,
        iconSpins: true,
      };
    case 'success':
      return {
        heading: 'Face Recognised',
        subtext: 'Welcome back — redirecting…',
        buttonLabel: 'Face Recognised',
        icon: CheckCircle2,
      };
    case 'notRecognised':
      return {
        heading: 'Not Recognised',
        subtext: "We couldn't match your face. Try again.",
        buttonLabel: 'TRY AGAIN',
        icon: XCircle,
      };
    case 'networkError':
      return {
        heading: 'Connection Problem',
        subtext: "Couldn't reach the server. Check your connection and try again.",
        buttonLabel: 'TRY AGAIN',
        icon: AlertTriangle,
      };
    case 'timeout':
      return {
        heading: 'Taking Too Long',
        subtext: 'The scan timed out. Try again.',
        buttonLabel: 'TRY AGAIN',
        icon: AlertTriangle,
      };
    default:
      return {
        heading: 'Face Recognition',
        subtext: state.guidance,
        buttonLabel: 'SCAN FACE',
        icon: ScanFace,
      };
  }
}

function getUnsupportedGuidance(error: CameraAccessError) {
  switch (error.code) {
    case 'no_device':
      return 'No camera was found on this device.';
    case 'unavailable':
      return 'The camera is unavailable or already in use.';
    default:
      return "Your browser or device doesn't support camera access.";
  }
}

function mapVerificationFailure(status: 'not_recognised' | 'network_error' | 'timeout'): VerificationFailureStatus {
  if (status === 'not_recognised') return 'notRecognised';
  if (status === 'timeout') return 'timeout';
  return 'networkError';
}

function captureVideoFrame(video: HTMLVideoElement) {
  return new Promise<Blob>((resolve, reject) => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      reject(new Error('The camera frame is not ready.'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      canvas.width = 1;
      canvas.height = 1;
      reject(new Error('Image capture is not supported.'));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 1;
        canvas.height = 1;

        if (blob) resolve(blob);
        else reject(new Error('The camera frame could not be captured.'));
      },
      'image/jpeg',
      0.85,
    );
  });
}

export default function FaceScan() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const { staffNumber, employeeId, accessToken } = useSession();
  const mode = getBiometricScanMode(location.state);
  const enrollmentSource = getBiometricEnrollmentSource(location.state);
  const profileFrom = getProfileOrigin(location.state);
  const clockingFlow = getClockingFlowNavigationState(location.state);
  const isRegistrationEnrollment = mode === 'enroll' && enrollmentSource === 'registration';
  const [state, dispatch] = useReducer(faceScanReducer, initialFaceScanState);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<unknown>(null);
  const { videoRef, startCamera, stopCamera } = useCamera();
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const detectionEnabled = detectionEnabledStatuses.has(state.status);
  const detection = useFaceDetection(videoRef, detectionEnabled);
  const presentation = getPresentation(state);
  const StatusIcon = presentation.icon;
  const canRetry = retryStatuses.has(state.status);
  const actionEnabled = state.status === 'faceAligned' || canRetry;
  const showLiveVideo = liveVideoStatuses.has(state.status);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'REQUEST_CAMERA' });

    void startCamera()
      .then(() => {
        if (active) dispatch({ type: 'CAMERA_GRANTED' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const cameraError =
          error instanceof CameraAccessError
            ? error
            : new CameraAccessError('unavailable', 'The camera could not be started.', error);

        if (cameraError.code === 'cancelled') return;
        if (cameraError.code === 'permission_denied') {
          dispatch({ type: 'CAMERA_DENIED' });
          return;
        }

        dispatch({ type: 'CAMERA_UNSUPPORTED', guidance: getUnsupportedGuidance(cameraError) });
      });

    return () => {
      active = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (detection.error) {
      stopCamera();
      dispatch({ type: 'CAMERA_UNSUPPORTED', guidance: detection.error });
      return;
    }

    if (!detection.detectorReady || !detectionEnabled) return;
    dispatch({
      type: 'DETECTION_UPDATED',
      faceDetected: detection.faceDetected,
      aligned: detection.aligned,
      guidance: detection.guidance,
    });
  }, [
    detection.aligned,
    detection.detectorReady,
    detection.error,
    detection.faceDetected,
    detection.guidance,
    detectionEnabled,
    stopCamera,
  ]);

  useEffect(() => {
    if (mode === 'verify' && !clockingFlow) {
      navigate('/clock', { replace: true });
    }
  }, [clockingFlow, mode, navigate]);

  useEffect(() => {
    if (state.status !== 'success') return;
    stopCamera();
    const redirectTimer = window.setTimeout(() => {
      if (mode === 'enroll') {
        if (isRegistrationEnrollment) {
          logout(REGISTRATION_REQUEST_SUBMITTED_MESSAGE);
          return;
        }

        navigate('/profile', {
          replace: true,
          state: { biometricUpdateMessage: 'Face recognition updated successfully.', from: profileFrom },
        });
        return;
      }

      if (!clockingFlow || !confirmationState) {
        navigate('/clock', { replace: true });
        return;
      }

      navigate(getConfirmationPath(clockingFlow.intendedAction), {
        replace: true,
        state: confirmationState,
      });
    }, 1200);
    return () => window.clearTimeout(redirectTimer);
  }, [
    clockingFlow,
    confirmationState,
    isRegistrationEnrollment,
    logout,
    mode,
    navigate,
    profileFrom,
    state.status,
    stopCamera,
  ]);

  useEffect(() => {
    if (mode !== 'verify' || state.status !== 'maxAttemptsReached') return;
    stopCamera();
    navigate('/not-registered', { replace: true, state: { scanType: 'face' } });
  }, [mode, navigate, state.status, stopCamera]);

  const handlePrimaryAction = async () => {
    if (canRetry) {
      setSubmissionError(null);
      dispatch({ type: 'RETRY' });
      return;
    }

    if (state.status !== 'faceAligned' || requestInFlightRef.current) return;

    const video = videoRef.current;
    if (!video) return;

    // Capture remains user-initiated after the detector reports ~900 ms of stable alignment.
    requestInFlightRef.current = true;
    dispatch({ type: 'CAPTURE' });
    let capturedImage: Blob | null = null;
    let sendingStarted = false;

    try {
      capturedImage = await captureVideoFrame(video);
      if (!mountedRef.current) return;

      dispatch({ type: 'SEND' });
      sendingStarted = true;
      if (mode === 'enroll') {
        const result = await registerFace(capturedImage);
        capturedImage = null;

        if (!mountedRef.current) return;
        if (result.status === 'registered') {
          dispatch({ type: 'VERIFY_SUCCESS' });
        } else {
          dispatch({
            type: 'VERIFY_FAILURE',
            status: mapVerificationFailure(result.status),
            enforceAttemptLimit: false,
          });
        }
        return;
      }

      const result = await verifyFace(capturedImage);
      capturedImage = null;

      if (!mountedRef.current) return;
      if (result.status === 'recognised') {
        if (!clockingFlow || !employeeId || !accessToken) {
          throw new Error('The authenticated employee clocking session is incomplete.');
        }

        const employeeNumber =
          staffNumber ??
          (
            await getTodayAttendance(
              employeeId,
              accessToken,
            )
          ).employeeNumber;

        const verification = await verifyMockBiometric(
          employeeNumber,
          accessToken,
        );
        const event = await recordLiveAttendance(
          clockingFlow.intendedAction,
          {
            employeeId,
            verificationToken: verification.verificationToken,
            location: clockingFlow.locationEvidence,
          },
          accessToken,
        );
        const summary = await getTodayAttendance(employeeId, accessToken);

        if (!mountedRef.current) return;
        setConfirmationState({
          intendedAction: clockingFlow.intendedAction,
          event,
          summary,
        });
        dispatch({ type: 'VERIFY_SUCCESS' });
      } else {
        dispatch({
          type: 'VERIFY_FAILURE',
          status: mapVerificationFailure(result.status),
          enforceAttemptLimit: true,
        });
      }
    } catch (error) {
      capturedImage = null;
      if (mountedRef.current) {
        if (
          mode === 'verify' &&
          isBiometricEnrolmentRequired(error)
        ) {
          stopCamera();
          navigate('/not-registered', {
            replace: true,
            state: { scanType: 'face' },
          });
          return;
        }

        setSubmissionError(
          error instanceof Error
            ? error.message
            : 'The attendance event could not be recorded.',
        );
        if (!sendingStarted) dispatch({ type: 'SEND' });
        dispatch({
          type: 'VERIFY_FAILURE',
          status: 'networkError',
          enforceAttemptLimit: mode === 'verify',
        });
      }
    } finally {
      capturedImage = null;
      requestInFlightRef.current = false;
    }
  };

  const backTo =
    mode === 'verify' ? '/dashboard' : isRegistrationEnrollment ? '/not-registered' : '/update-biometrics';
  const backState = isRegistrationEnrollment
    ? { scanType: 'face' as const }
    : mode === 'enroll'
      ? { from: profileFrom }
      : clockingFlow ?? undefined;

  return (
    // AppShell's desktop minimum height pushed the manual scan action below short viewports.
    <AppShell className="sm:!min-h-[calc(100dvh-4rem)]">
      <ScreenHeader title="Face Recognition" backTo={backTo} backState={backState} />
      <div className="flex flex-1 flex-col items-center justify-between pb-2 pt-5">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-light-grey/60">
            <StatusIcon
              className={`h-8 w-8 text-black ${presentation.iconSpins ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <div className="text-center" aria-live="polite" aria-atomic="true">
            <h1 className="mt-6 max-w-[310px] text-center text-lg font-semibold leading-[1.45]">
              {presentation.heading}
            </h1>
            <p className="mt-2 max-w-[330px] text-center text-sm text-dark-grey">{presentation.subtext}</p>
            {submissionError ? (
              <NoticeBanner
                className="mt-4 max-w-[330px] text-left"
                role="alert"
                icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.5} />}
              >
                {submissionError}
              </NoticeBanner>
            ) : null}
          </div>
          <div
            className="relative mt-6 aspect-square w-[280px] max-w-full overflow-hidden rounded-card border border-light-grey bg-white shadow-sm"
            aria-label="Face scan frame"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full scale-x-[-1] object-cover ${showLiveVideo ? 'opacity-100' : 'opacity-0'}`}
            />
            {!showLiveVideo ? <span className="face-silhouette" aria-hidden="true" /> : null}
            <span className="scan-corner scan-corner-tl z-10" aria-hidden="true" />
            <span className="scan-corner scan-corner-tr z-10" aria-hidden="true" />
            <span className="scan-corner scan-corner-bl z-10" aria-hidden="true" />
            <span className="scan-corner scan-corner-br z-10" aria-hidden="true" />
          </div>
        </div>
        <div className="w-full space-y-6 pt-6">
          <Button
            onClick={handlePrimaryAction}
            disabled={!actionEnabled || requestInFlightRef.current}
            aria-busy={state.status === 'capturing' || state.status === 'sending'}
            className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none disabled:hover:opacity-100"
          >
            {presentation.buttonLabel}
          </Button>
          <SecurityFooter />
        </div>
      </div>
    </AppShell>
  );
}
