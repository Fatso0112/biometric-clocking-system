using ClockingManagement.Application.Biometrics;

namespace ClockingManagement.Infrastructure.Biometrics;

public sealed class MockBiometricVerificationService
    : IBiometricVerificationService
{
    public async Task<BiometricVerificationResult> VerifyAsync(
        Guid employeeId,
        CancellationToken cancellationToken)
    {
        await Task.Delay(
            TimeSpan.FromMilliseconds(800),
            cancellationToken);

        return new BiometricVerificationResult(
            IsVerified: true,
            Confidence: 98.40m,
            Message:
                "Employee identity verified using the mock facial-recognition provider.");
    }
}