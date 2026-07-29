export interface WebAuthnSuccess {
  status: 'recognised';
  employee: { staffNo: string; name: string };
}

export interface WebAuthnFailure {
  status: 'not_recognised' | 'network_error' | 'timeout';
}

export type WebAuthnResult = WebAuthnSuccess | WebAuthnFailure;

type MockOutcome = WebAuthnResult['status'];

const MOCK_DELAY_MS = 1200;
const mockCycle: MockOutcome[] = ['recognised', 'not_recognised', 'network_error', 'timeout'];
let mockCycleIndex = 0;

function createChallenge() {
  return crypto.getRandomValues(new Uint8Array(32));
}

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function getMockOutcome(): MockOutcome {
  const requested = new URLSearchParams(window.location.search).get('fingerprintResult');

  if (requested === 'cycle') {
    const outcome = mockCycle[mockCycleIndex % mockCycle.length];
    mockCycleIndex += 1;
    return outcome;
  }

  const outcomes: Record<string, MockOutcome> = {
    success: 'recognised',
    recognised: 'recognised',
    'not-recognised': 'not_recognised',
    not_recognised: 'not_recognised',
    'network-error': 'network_error',
    network_error: 'network_error',
    timeout: 'timeout',
  };

  return requested ? outcomes[requested] ?? 'recognised' : 'recognised';
}

export async function getAssertionOptions(): Promise<PublicKeyCredentialRequestOptions> {
  // MOCK IMPLEMENTATION — a real backend must generate a one-time challenge tied to the staff number.
  // The mock omits rpId so the browser derives it from localhost; production options should supply it server-side.
  return {
    challenge: createChallenge(),
    timeout: 60_000,
    userVerification: 'required',
  };
}

export async function verifyAssertion(assertion: PublicKeyCredential): Promise<WebAuthnResult> {
  // MOCK IMPLEMENTATION — use ?fingerprintResult=success|not-recognised|network-error|timeout|cycle.
  // A real implementation serializes and POSTs the assertion, then verifies its signature server-side
  // against the employee's previously registered public key.
  void assertion;

  const outcome = getMockOutcome();
  await wait(MOCK_DELAY_MS);

  if (outcome === 'recognised') {
    return { status: 'recognised', employee: { staffNo: '10001', name: 'Employee' } };
  }

  return { status: outcome };
}

export function getDevTestCredentialOptions(): PublicKeyCredentialCreationOptions {
  // DEV-ONLY LOCAL TESTING AID — production enrollment belongs to the backend/admin flow.
  // rp.id is likewise derived from the current localhost origin for virtual-authenticator testing.
  return {
    challenge: createChallenge(),
    rp: {
      name: 'HR Attendance Management System',
    },
    user: {
      id: crypto.getRandomValues(new Uint8Array(16)),
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
