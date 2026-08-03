using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Biometrics;

public sealed record MockBiometricVerificationRequest(
    [Required]
    [StringLength(30, MinimumLength = 2)]
    string EmployeeNumber,

    [Required]
    [StringLength(30, MinimumLength = 2)]
    string AttendanceAction);

public sealed record BiometricVerificationResponse(
    Guid SessionId,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string VerificationToken,
    decimal Confidence,
    DateTimeOffset ExpiresAtUtc,
    bool IsMock,
    string Message);

public sealed record BiometricVerificationResult(
    bool IsVerified,
    decimal Confidence,
    string Message);