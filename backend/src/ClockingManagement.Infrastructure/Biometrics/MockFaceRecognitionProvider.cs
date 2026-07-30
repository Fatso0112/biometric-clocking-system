using ClockingManagement.Application.Biometrics;

namespace ClockingManagement.Infrastructure.Biometrics;

public sealed class MockFaceRecognitionProvider
    : IFaceRecognitionProvider
{
    public Task<ProviderEnrolmentResult> EnrolAsync(
        Guid employeeId,
        string? label,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            new ProviderEnrolmentResult(
                ProviderName: "MockFace",
                ExternalReference:
                    $"mock-face-{employeeId:N}-{Guid.NewGuid():N}",
                QualityScore: 0.9600m,
                Message: "Mock face enrolment completed."));
    }

    public Task RevokeAsync(
        string externalReference,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.CompletedTask;
    }
}
