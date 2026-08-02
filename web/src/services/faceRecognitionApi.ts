export interface FaceVerificationSuccess {
  status: 'recognised';
  employee: { staffNo: string; name: string };
}

export interface FaceVerificationFailure {
  status: 'not_recognised' | 'network_error' | 'timeout';
}

export type FaceVerificationResult = FaceVerificationSuccess | FaceVerificationFailure;

export interface FaceRegistrationSuccess {
  status: 'registered';
}

export interface FaceRegistrationFailure {
  status: 'network_error' | 'timeout';
}

export type FaceRegistrationResult = FaceRegistrationSuccess | FaceRegistrationFailure;

type MockOutcome = FaceVerificationResult['status'];

const MOCK_DELAY_MS = 1400;
const mockCycle: MockOutcome[] = ['recognised', 'not_recognised', 'network_error', 'timeout'];
let mockCycleIndex = 0;

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function getMockOutcome(): MockOutcome {
  const requested = new URLSearchParams(window.location.search).get('faceResult');

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

export async function verifyFace(image: Blob): Promise<FaceVerificationResult> {
  // MOCK IMPLEMENTATION — use ?faceResult=success|not-recognised|network-error|timeout|cycle.
  // Replace only this function with a real call, for example:
  // const form = new FormData(); form.append('image', image, 'capture.jpg');
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/face/verify`, { method: 'POST', body: form });
  // return await res.json() as FaceVerificationResult;
  void image;

  const outcome = getMockOutcome();
  await wait(MOCK_DELAY_MS);

  if (outcome === 'recognised') {
    return { status: 'recognised', employee: { staffNo: '10001', name: 'Employee' } };
  }

  return { status: outcome };
}

export async function registerFace(image: Blob): Promise<FaceRegistrationResult> {
  // MOCK IMPLEMENTATION — use ?faceEnrollResult=success|network-error|timeout.
  // A real implementation uploads the captured image to the face-enrollment endpoint.
  void image;

  const requested = new URLSearchParams(window.location.search).get('faceEnrollResult');
  await wait(MOCK_DELAY_MS);

  if (requested === 'network-error' || requested === 'network_error') return { status: 'network_error' };
  if (requested === 'timeout') return { status: 'timeout' };
  return { status: 'registered' };
}
