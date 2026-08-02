export interface PasswordResetSuccess {
  status: 'sent';
  maskedEmail: string;
}

export interface PasswordResetFailure {
  status: 'not_found' | 'network_error';
}

export type PasswordResetResult = PasswordResetSuccess | PasswordResetFailure;

type MockOutcome = PasswordResetResult['status'];

const MOCK_DELAY_MS = 900;
const MOCK_STAFF_NUMBER = '10001';

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function getMockOutcome(staffNumber: string): MockOutcome {
  const requested = new URLSearchParams(window.location.search).get('passwordResetResult');
  const outcomes: Record<string, MockOutcome> = {
    sent: 'sent',
    success: 'sent',
    'not-found': 'not_found',
    not_found: 'not_found',
    'network-error': 'network_error',
    network_error: 'network_error',
  };

  if (requested) return outcomes[requested] ?? 'sent';
  return staffNumber === MOCK_STAFF_NUMBER ? 'sent' : 'not_found';
}

export async function requestPasswordReset(staffNumber: string): Promise<PasswordResetResult> {
  // MOCK IMPLEMENTATION — use staff number 10001 for success, or override with
  // ?passwordResetResult=sent|not-found|network-error. A real implementation
  // looks up the employee, generates a one-time token, and emails the reset link.
  const outcome = getMockOutcome(staffNumber.trim());
  await wait(MOCK_DELAY_MS);

  if (outcome === 'sent') {
    return { status: 'sent', maskedEmail: 'e****@email.com' };
  }

  return { status: outcome };
}
