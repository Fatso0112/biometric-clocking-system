using ClockingManagement.Application.Biometrics;

namespace ClockingManagement.Infrastructure.Biometrics;

public sealed class MockFingerprintRecognitionProvider
    : IFingerprintRecognitionProvider
{
    public Task<ProviderEnrolmentResult> EnrolAsync(
        Guid employeeId,
        string? label,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            new ProviderEnrolmentResult(
                ProviderName: "MockFingerprint",
                ExternalReference:
                    $"mock-fingerprint-{employeeId:N}-{Guid.NewGuid():N}",
                QualityScore: 0.9400m,
                Message: "Mock fingerprint enrolment completed."));
    }

    public Task RevokeAsync(
        string externalReference,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.CompletedTask;
    }
}
