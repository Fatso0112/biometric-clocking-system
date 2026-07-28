namespace ClockingManagement.Application.Biometrics;

public interface IBiometricVerificationService
{
    Task<BiometricVerificationResult> VerifyAsync(
        Guid employeeId,
        CancellationToken cancellationToken);
}
