"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockScenarioError = void 0;
exports.resolveMockScenario = resolveMockScenario;
class MockScenarioError extends Error {
    constructor(message, scenario) {
        super(message);
        Object.defineProperty(this, "scenario", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: scenario
        });
        this.name = 'MockScenarioError';
    }
}
exports.MockScenarioError = MockScenarioError;
async function resolveMockScenario({ scenario, happyValue, emptyValue, delayMs = 0, }) {
    if (delayMs > 0) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
    }
    if (scenario === 'timeout') {
        throw new MockScenarioError('The mock request timed out.', scenario);
    }
    if (scenario === 'error') {
        throw new MockScenarioError('The mock request failed.', scenario);
    }
    return scenario === 'empty' ? emptyValue : happyValue;
}
