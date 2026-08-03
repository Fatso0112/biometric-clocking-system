import type { IntendedClockAction } from '../types/navigation';
import { apiRequest } from './httpClient';

interface WebAuthnOptionsEnvelope {
  challengeId: string;
  publicKey: Record<string, unknown>;
}

export interface WebAuthnCredentialSummary {
  id: string;
  deviceName: string;
  createdAtUtc: string;
  lastUsedAtUtc: string | null;
}

export interface DeviceVerificationResponse {
  sessionId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  verificationToken: string;
  confidence: number;
  expiresAtUtc: string;
  isMock: boolean;
  message: string;
}

type JsonCredentialDescriptor = {
  type: PublicKeyCredentialType;
  id: string;
  transports?: AuthenticatorTransport[];
};

type JsonCreationOptions = Omit<
  PublicKeyCredentialCreationOptions,
  'challenge' | 'user' | 'excludeCredentials'
> & {
  challenge: string;
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & {
    id: string;
  };
  excludeCredentials?: JsonCredentialDescriptor[];
};

type JsonRequestOptions = Omit<
  PublicKeyCredentialRequestOptions,
  'challenge' | 'allowCredentials'
> & {
  challenge: string;
  allowCredentials?: JsonCredentialDescriptor[];
};

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '=',
  );

  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function arrayBufferToBase64Url(
  value: ArrayBuffer,
): string {
  const bytes = new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeDescriptors(
  descriptors: JsonCredentialDescriptor[] | undefined,
): PublicKeyCredentialDescriptor[] | undefined {
  return descriptors?.map((descriptor) => ({
    ...descriptor,
    id: base64UrlToArrayBuffer(descriptor.id),
  }));
}

function decodeCreationOptions(
  source: Record<string, unknown>,
): PublicKeyCredentialCreationOptions {
  const options = source as unknown as JsonCreationOptions;

  return {
    ...options,
    challenge: base64UrlToArrayBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToArrayBuffer(options.user.id),
    },
    excludeCredentials: decodeDescriptors(
      options.excludeCredentials,
    ),
  };
}

function decodeRequestOptions(
  source: Record<string, unknown>,
): PublicKeyCredentialRequestOptions {
  const options = source as unknown as JsonRequestOptions;

  return {
    ...options,
    challenge: base64UrlToArrayBuffer(options.challenge),
    allowCredentials: decodeDescriptors(
      options.allowCredentials,
    ),
  };
}

function serializeRegistrationCredential(
  credential: PublicKeyCredential,
) {
  const response =
    credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    extensions: credential.getClientExtensionResults(),
    response: {
      attestationObject: arrayBufferToBase64Url(
        response.attestationObject,
      ),
      clientDataJSON: arrayBufferToBase64Url(
        response.clientDataJSON,
      ),
      transports:
        typeof response.getTransports === 'function'
          ? response.getTransports()
          : [],
    },
  };
}

function serializeAuthenticationCredential(
  credential: PublicKeyCredential,
) {
  const response =
    credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    extensions: credential.getClientExtensionResults(),
    response: {
      authenticatorData: arrayBufferToBase64Url(
        response.authenticatorData,
      ),
      clientDataJSON: arrayBufferToBase64Url(
        response.clientDataJSON,
      ),
      signature: arrayBufferToBase64Url(
        response.signature,
      ),
      userHandle: response.userHandle
        ? arrayBufferToBase64Url(response.userHandle)
        : null,
    },
  };
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    Boolean(navigator.credentials)
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  return PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
}

export async function getRegisteredDeviceCredentials(
  accessToken: string,
): Promise<WebAuthnCredentialSummary[]> {
  return apiRequest<WebAuthnCredentialSummary[]>(
    '/api/v1/webauthn/credentials',
    {},
    accessToken,
  );
}

export async function revokeDeviceCredential(
  credentialId: string,
  accessToken: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/webauthn/credentials/${encodeURIComponent(
      credentialId,
    )}`,
    {
      method: 'DELETE',
    },
    accessToken,
  );
}

export async function registerDeviceCredential(
  deviceName: string,
  accessToken: string,
): Promise<WebAuthnCredentialSummary> {
  const options = await apiRequest<WebAuthnOptionsEnvelope>(
    '/api/v1/webauthn/registration/options',
    {
      method: 'POST',
      body: JSON.stringify({ deviceName }),
    },
    accessToken,
  );

  const credential = await navigator.credentials.create({
    publicKey: decodeCreationOptions(options.publicKey),
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error(
      'Device registration was not completed.',
    );
  }

  return apiRequest<WebAuthnCredentialSummary>(
    '/api/v1/webauthn/registration/complete',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: options.challengeId,
        deviceName,
        credential:
          serializeRegistrationCredential(credential),
      }),
    },
    accessToken,
  );
}

export async function verifyDeviceForAttendance(
  attendanceAction: IntendedClockAction,
  accessToken: string,
): Promise<DeviceVerificationResponse> {
  const options = await apiRequest<WebAuthnOptionsEnvelope>(
    '/api/v1/webauthn/authentication/options',
    {
      method: 'POST',
      body: JSON.stringify({ attendanceAction }),
    },
    accessToken,
  );

  const credential = await navigator.credentials.get({
    publicKey: decodeRequestOptions(options.publicKey),
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error(
      'Device verification was not completed.',
    );
  }

  return apiRequest<DeviceVerificationResponse>(
    '/api/v1/webauthn/authentication/complete',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: options.challengeId,
        attendanceAction,
        credential:
          serializeAuthenticationCredential(credential),
      }),
    },
    accessToken,
  );
}

// Legacy scanner contracts are retained so the existing development-only
// fingerprint screen continues to compile. Production attendance uses the
// action-bound API functions above, and the backend mock endpoint is disabled.
export interface WebAuthnSuccess {
  status: 'recognised';
  employee: { staffNo: string; name: string };
}

export interface WebAuthnFailure {
  status:
    | 'not_recognised'
    | 'network_error'
    | 'timeout';
}

export type WebAuthnResult =
  | WebAuthnSuccess
  | WebAuthnFailure;

export interface WebAuthnRegistrationSuccess {
  status: 'registered';
}

export interface WebAuthnRegistrationFailure {
  status: 'network_error' | 'timeout';
}

export type WebAuthnRegistrationResult =
  | WebAuthnRegistrationSuccess
  | WebAuthnRegistrationFailure;

type LegacyMockOutcome = WebAuthnResult['status'];

const LEGACY_MOCK_DELAY_MS = 1200;
const legacyMockCycle: LegacyMockOutcome[] = [
  'recognised',
  'not_recognised',
  'network_error',
  'timeout',
];
let legacyMockCycleIndex = 0;

function createLegacyChallenge(): Uint8Array {
  return crypto.getRandomValues(
    new Uint8Array(32),
  );
}

function waitForLegacyMock(
  duration: number,
): Promise<void> {
  return new Promise((resolve) =>
    window.setTimeout(resolve, duration),
  );
}

function getLegacyMockOutcome(): LegacyMockOutcome {
  const requested = new URLSearchParams(
    window.location.search,
  ).get('fingerprintResult');

  if (requested === 'cycle') {
    const outcome =
      legacyMockCycle[
        legacyMockCycleIndex %
          legacyMockCycle.length
      ];

    legacyMockCycleIndex += 1;
    return outcome;
  }

  const outcomes: Record<
    string,
    LegacyMockOutcome
  > = {
    success: 'recognised',
    recognised: 'recognised',
    'not-recognised': 'not_recognised',
    not_recognised: 'not_recognised',
    'network-error': 'network_error',
    network_error: 'network_error',
    timeout: 'timeout',
  };

  return requested
    ? outcomes[requested] ?? 'recognised'
    : 'recognised';
}

export async function getAssertionOptions(): Promise<PublicKeyCredentialRequestOptions> {
  return {
    challenge: createLegacyChallenge(),
    timeout: 60_000,
    userVerification: 'required',
  };
}

export async function verifyAssertion(
  assertion: PublicKeyCredential,
): Promise<WebAuthnResult> {
  void assertion;

  const outcome = getLegacyMockOutcome();
  await waitForLegacyMock(
    LEGACY_MOCK_DELAY_MS,
  );

  if (outcome === 'recognised') {
    return {
      status: 'recognised',
      employee: {
        staffNo: '10001',
        name: 'Employee',
      },
    };
  }

  return { status: outcome };
}

export async function getRegistrationOptions(
  staffNumber: string,
): Promise<PublicKeyCredentialCreationOptions> {
  return {
    challenge: createLegacyChallenge(),
    rp: {
      name: 'HR Attendance Management System',
    },
    user: {
      id: new TextEncoder().encode(
        staffNumber,
      ),
      name: `${staffNumber}@hr.local`,
      displayName: `Employee ${staffNumber}`,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60_000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
  };
}

export async function registerCredential(
  credential: PublicKeyCredential,
): Promise<WebAuthnRegistrationResult> {
  void credential;

  const requested = new URLSearchParams(
    window.location.search,
  ).get('fingerprintEnrollResult');

  await waitForLegacyMock(
    LEGACY_MOCK_DELAY_MS,
  );

  if (
    requested === 'network-error' ||
    requested === 'network_error'
  ) {
    return { status: 'network_error' };
  }

  if (requested === 'timeout') {
    return { status: 'timeout' };
  }

  return { status: 'registered' };
}

export function getDevTestCredentialOptions(): PublicKeyCredentialCreationOptions {
  return {
    challenge: createLegacyChallenge(),
    rp: {
      name: 'HR Attendance Management System',
    },
    user: {
      id: crypto.getRandomValues(
        new Uint8Array(16),
      ),
      name: 'test.employee@local.dev',
      displayName: 'Test Employee',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60_000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
  };
}
