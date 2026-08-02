export type MockScenario = 'happy' | 'empty' | 'timeout' | 'error';

export class MockScenarioError extends Error {
  constructor(
    message: string,
    readonly scenario: Exclude<MockScenario, 'happy' | 'empty'>,
  ) {
    super(message);
    this.name = 'MockScenarioError';
  }
}

export interface MockScenarioOptions<T> {
  scenario: MockScenario;
  happyValue: T;
  emptyValue: T;
  delayMs?: number;
}

export async function resolveMockScenario<T>({
  scenario,
  happyValue,
  emptyValue,
  delayMs = 0,
}: MockScenarioOptions<T>): Promise<T> {
  if (delayMs > 0) {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs));
  }

  if (scenario === 'timeout') {
    throw new MockScenarioError('The mock request timed out.', scenario);
  }
  if (scenario === 'error') {
    throw new MockScenarioError('The mock request failed.', scenario);
  }
  return scenario === 'empty' ? emptyValue : happyValue;
}
