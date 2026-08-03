namespace ClockingManagement.Application.Biometrics;

public sealed record BiometricVerificationResponse(
    Guid SessionId,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string VerificationToken,
    decimal Confidence,
    DateTimeOffset ExpiresAtUtc,
    string Message);
