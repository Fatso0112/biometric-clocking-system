import { Fingerprint } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import SecurityFooter from '../components/SecurityFooter';
import {
  getAssertionOptions,
  getDevTestCredentialOptions,
  verifyAssertion,
} from '../services/webauthnApi';
import {
  fingerprintScanReducer,
  initialFingerprintScanState,
  type FingerprintScanState,
  type FingerprintScanStatus,
} from '../state/fingerprintScanMachine';

type FingerprintPresentation = {
  heading: string;
  subtext: string;
  buttonLabel: string;
};

type DevCredentialStatus = 'idle' | 'registering' | 'registered' | 'error';

const retryStatuses = new Set<FingerprintScanStatus>(['userCancelled', 'notRecognised', 'error']);

function getPresentation(state: FingerprintScanState): FingerprintPresentation {
  switch (state.status) {
    case 'checkingSupport':
      return {
        heading: 'Fingerprint Scan',
        subtext: 'Checking fingerprint support…',
        buttonLabel: 'CHECKING…',
      };
    case 'unsupported':
      return {
        heading: 'Fingerprint Not Available',
        subtext: "This device doesn't support fingerprint authentication.",
        buttonLabel: 'SCAN FINGER',
      };
    case 'requestingAuth':
      return {
        heading: 'Fingerprint Scan',
        subtext: 'Follow the prompt on your device',
        buttonLabel: 'SCANNING…',
      };
    case 'success':
      return {
        heading: 'Fingerprint Recognised',
        subtext: 'Welcome back — redirecting…',
        buttonLabel: 'VERIFIED',
      };
    case 'userCancelled':
      return {
        heading: 'Scan Cancelled',
        subtext: 'You cancelled the fingerprint prompt. Try again.',
        buttonLabel: 'TRY AGAIN',
      };
    case 'notRecognised':
      return {
        heading: 'Not Recognised',
        subtext: "We couldn't verify your fingerprint. Try again.",
        buttonLabel: 'TRY AGAIN',
      };
    case 'error':
      return {
        heading: 'Connection Problem',
        subtext: 'Something went wrong. Try again.',
        buttonLabel: 'TRY AGAIN',
      };
    default:
      return {
        heading: 'Place your registered finger on the scanner',
        subtext: 'Hold your finger steady',
        buttonLabel: 'SCAN FINGER',
      };
  }
}

function isUserCancellation(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}

function getDevCredentialLabel(status: DevCredentialStatus) {
  switch (status) {
    case 'registering':
      return 'Registering Test Credential…';
    case 'registered':
      return 'Test Credential Registered';
    case 'error':
      return 'Registration Failed — Try Again';
    default:
      return 'Register Test Credential';
  }
}

export default function FingerprintScan() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(fingerprintScanReducer, initialFingerprintScanState);
  const [devCredentialStatus, setDevCredentialStatus] = useState<DevCredentialStatus>('idle');
  const mountedRef = useRef(true);
  const requestInFlightRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const presentation = getPresentation(state);
  const canRetry = retryStatuses.has(state.status);
  const actionEnabled = state.status === 'ready' || canRetry;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      requestInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'CHECK_SUPPORT' });

    void (async () => {
      const supported =
        typeof window.PublicKeyCredential !== 'undefined' &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
        typeof navigator.credentials?.get === 'function' &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());

      if (active) dispatch({ type: supported ? 'SUPPORT_AVAILABLE' : 'SUPPORT_UNAVAILABLE' });
    })().catch(() => {
      if (active) dispatch({ type: 'SUPPORT_UNAVAILABLE' });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== 'success') return;
    const redirectTimer = window.setTimeout(() => navigate('/clock-in-confirmation', { replace: true }), 1500);
    return () => window.clearTimeout(redirectTimer);
  }, [navigate, state.status]);

  useEffect(() => {
    if (state.status === 'maxAttemptsReached') navigate('/not-registered', { replace: true });
  }, [navigate, state.status]);

  const handlePrimaryAction = async () => {
    if (canRetry) {
      dispatch({ type: 'RETRY' });
      return;
    }

    if (state.status !== 'ready' || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    dispatch({ type: 'REQUEST_AUTH' });
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const publicKey = await getAssertionOptions();
      const credential = await navigator.credentials.get({ publicKey, signal: controller.signal });

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('The authenticator did not return a public-key credential.');
      }

      const result = await verifyAssertion(credential);
      if (!mountedRef.current) return;

      if (result.status === 'recognised') {
        dispatch({ type: 'AUTH_SUCCESS' });
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          status: result.status === 'not_recognised' ? 'notRecognised' : 'error',
        });
      }
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted) return;
      dispatch({ type: 'AUTH_FAILURE', status: isUserCancellation(error) ? 'userCancelled' : 'error' });
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      requestInFlightRef.current = false;
    }
  };

  const handleRegisterTestCredential = async () => {
    if (!import.meta.env.DEV || requestControllerRef.current || devCredentialStatus === 'registering') return;

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setDevCredentialStatus('registering');

    try {
      const credential = await navigator.credentials.create({
        publicKey: getDevTestCredentialOptions(),
        signal: controller.signal,
      });

      if (!mountedRef.current || controller.signal.aborted) return;
      setDevCredentialStatus(credential instanceof PublicKeyCredential ? 'registered' : 'error');
    } catch {
      if (mountedRef.current && !controller.signal.aborted) setDevCredentialStatus('error');
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  };

  return (
    // Match FaceScan's short-desktop override so the scan action is not pushed below the viewport.
    <AppShell className="sm:!min-h-[calc(100dvh-4rem)]">
      <ScreenHeader title="Fingerprint Scan" backTo="/dashboard" />
      <div className="flex flex-1 flex-col items-center justify-between pb-2 pt-5">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-light-grey/60">
            <Fingerprint className="h-9 w-9 text-black" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="text-center" aria-live="polite" aria-atomic="true">
            <h1 className="mt-6 max-w-[320px] text-center text-lg font-semibold leading-[1.45]">
              {presentation.heading}
            </h1>
            <p className="mt-2 text-center text-sm text-dark-grey">{presentation.subtext}</p>
          </div>
          <div
            className={`mt-7 flex aspect-square w-[280px] max-w-full items-center justify-center rounded-full p-[4px] ${
              state.status === 'requestingAuth' ? 'animate-pulse' : ''
            }`}
            style={{ background: 'conic-gradient(from -90deg, #1C1C1C 0deg 180deg, #E8E8EB 180deg 360deg)' }}
            aria-label={state.status === 'requestingAuth' ? 'Waiting for device authentication' : 'Fingerprint authentication'}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-cream-white">
              <Fingerprint className="h-28 w-28 text-dark-grey/60" strokeWidth={1.5} aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="w-full space-y-6 pt-6">
          <Button
            onClick={handlePrimaryAction}
            disabled={!actionEnabled || requestInFlightRef.current}
            aria-busy={state.status === 'requestingAuth'}
            className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none disabled:hover:opacity-100"
          >
            {presentation.buttonLabel}
          </Button>
          {import.meta.env.DEV ? (
            <button
              type="button"
              onClick={handleRegisterTestCredential}
              disabled={
                state.status === 'checkingSupport' ||
                state.status === 'unsupported' ||
                state.status === 'requestingAuth' ||
                devCredentialStatus === 'registering' ||
                devCredentialStatus === 'registered'
              }
              className="w-full text-center text-xs text-dark-grey underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {getDevCredentialLabel(devCredentialStatus)}
            </button>
          ) : null}
          <SecurityFooter />
        </div>
      </div>
    </AppShell>
  );
}
