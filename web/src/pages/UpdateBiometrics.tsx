import {
  AlertCircle,
  Fingerprint,
  LoaderCircle,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import {
  getRegisteredDeviceCredentials,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  registerDeviceCredential,
  revokeDeviceCredential,
  type WebAuthnCredentialSummary,
} from '../services/webauthnApi';
import { getProfileOrigin } from '../types/navigation';

function getDefaultDeviceName(): string {
  const navigatorWithUserAgentData =
    navigator as Navigator & {
      userAgentData?: { platform?: string };
    };

  const platform =
    navigatorWithUserAgentData.userAgentData
      ?.platform;

  if (platform) {
    return `${platform} phone`;
  }

  if (/iPhone|iPad/i.test(navigator.userAgent)) {
    return 'Apple mobile device';
  }

  if (/Android/i.test(navigator.userAgent)) {
    return 'Android phone';
  }

  return 'Personal device';
}

function formatDate(value: string | null): string {
  if (!value) return 'Not used yet';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getRegistrationError(error: unknown): string {
  if (
    error instanceof DOMException &&
    error.name === 'NotAllowedError'
  ) {
    return 'Device registration was cancelled or timed out.';
  }

  if (
    error instanceof DOMException &&
    error.name === 'InvalidStateError'
  ) {
    return 'This device credential is already registered.';
  }

  if (
    error instanceof DOMException &&
    error.name === 'SecurityError'
  ) {
    return 'WebAuthn is not configured for this website domain.';
  }

  return error instanceof Error
    ? error.message
    : 'The device could not be registered.';
}

export default function UpdateBiometrics() {
  const location = useLocation();
  const profileFrom = getProfileOrigin(location.state);
  const { accessToken } = useSession();

  const [deviceName, setDeviceName] = useState(
    getDefaultDeviceName,
  );

  const [credentials, setCredentials] = useState<
    WebAuthnCredentialSummary[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] =
    useState(false);
  const [revokingId, setRevokingId] =
    useState<string | null>(null);
  const [isAvailable, setIsAvailable] =
    useState(false);
  const [message, setMessage] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function loadCredentials() {
    if (!accessToken) return;

    setIsLoading(true);

    try {
      setCredentials(
        await getRegisteredDeviceCredentials(
          accessToken,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Registered devices could not be loaded.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    if (!isWebAuthnSupported()) {
      setIsAvailable(false);
      void loadCredentials();
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
      });

    void loadCredentials();

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleRegister() {
    if (!accessToken) {
      setErrorMessage(
        'Your login session is incomplete. Please log in again.',
      );
      return;
    }

    setIsRegistering(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const credential =
        await registerDeviceCredential(
          deviceName,
          accessToken,
        );

      setCredentials((current) => [
        credential,
        ...current.filter(
          (item) => item.id !== credential.id,
        ),
      ]);

      setMessage(
        'This device is registered for attendance verification.',
      );
    } catch (error) {
      setErrorMessage(
        getRegistrationError(error),
      );
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRevoke(
    credentialId: string,
  ) {
    if (!accessToken) return;

    setRevokingId(credentialId);
    setMessage(null);
    setErrorMessage(null);

    try {
      await revokeDeviceCredential(
        credentialId,
        accessToken,
      );

      setCredentials((current) =>
        current.filter(
          (item) => item.id !== credentialId,
        ),
      );

      setMessage(
        'The device credential was removed.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The device credential could not be removed.',
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Device Biometrics"
        backTo="/profile"
        backState={{ from: profileFrom }}
      />

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-light-grey">
            <Fingerprint
              className="h-8 w-8"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              Register this phone
            </h1>

            <p className="mt-2 text-sm leading-6 text-dark-grey">
              The phone creates a protected credential and
              unlocks it with its configured face,
              fingerprint, or secure device verification.
              Your biometric template is never uploaded.
            </p>
          </div>
        </div>

        {message ? (
          <NoticeBanner
            className="mt-5"
            icon={
              <Fingerprint
                className="h-5 w-5"
                strokeWidth={1.5}
              />
            }
          >
            {message}
          </NoticeBanner>
        ) : null}

        {errorMessage ? (
          <NoticeBanner
            className="mt-5"
            role="alert"
            icon={
              <AlertCircle
                className="h-5 w-5"
                strokeWidth={1.5}
              />
            }
          >
            {errorMessage}
          </NoticeBanner>
        ) : null}

        <div className="mt-5">
          <Input
            id="device-name"
            name="device-name"
            label="Device Name"
            icon={
              <Smartphone
                className="h-5 w-5"
                strokeWidth={1.5}
              />
            }
            value={deviceName}
            maxLength={120}
            onChange={(event) =>
              setDeviceName(event.target.value)
            }
          />
        </div>

        {!isAvailable ? (
          <NoticeBanner
            className="mt-5"
            role="alert"
            icon={
              <AlertCircle
                className="h-5 w-5"
                strokeWidth={1.5}
              />
            }
          >
            This browser does not currently expose a
            user-verifying platform authenticator. Use the
            current Chrome, Safari, or Edge browser on a
            phone with a screen lock configured.
          </NoticeBanner>
        ) : null}

        <Button
          type="button"
          className="mt-5 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey"
          disabled={
            !isAvailable ||
            isRegistering ||
            deviceName.trim() === ''
          }
          onClick={() => {
            void handleRegister();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isRegistering ? (
              <LoaderCircle
                className="h-5 w-5 animate-spin"
                strokeWidth={1.5}
              />
            ) : (
              <Fingerprint
                className="h-5 w-5"
                strokeWidth={1.5}
              />
            )}

            {isRegistering
              ? 'REGISTERING…'
              : 'REGISTER THIS DEVICE'}
          </span>
        </Button>
      </Card>

      <Card className="mt-5 p-5">
        <h2 className="text-lg font-semibold">
          Registered devices
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-dark-grey">
            Loading registered devices…
          </p>
        ) : credentials.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-dark-grey">
            No device has been registered yet. Register the
            phone before attempting to clock in or clock out.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-light-grey">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center gap-3 py-4"
              >
                <Smartphone
                  className="h-6 w-6 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {credential.deviceName}
                  </p>

                  <p className="mt-1 text-xs text-dark-grey">
                    Last used: {formatDate(
                      credential.lastUsedAtUtc,
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    revokingId === credential.id
                  }
                  onClick={() => {
                    void handleRevoke(
                      credential.id,
                    );
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-light-grey disabled:opacity-50"
                  aria-label={`Remove ${credential.deviceName}`}
                >
                  <Trash2
                    className="h-5 w-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
