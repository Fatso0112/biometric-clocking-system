using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class BiometricRecognitionAttempt
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } =
        null!;

    public Guid? BiometricEnrolmentId { get; set; }

    public BiometricEnrolment? BiometricEnrolment
        { get; set; }

    public BiometricModality Modality { get; set; }

    public string ProviderName { get; set; } =
        string.Empty;

    public BiometricRecognitionOutcome Outcome
        { get; set; }

    public decimal? Confidence { get; set; }

    public string? FailureCode { get; set; }

    public string? IpAddress { get; set; }

    public DateTimeOffset AttemptedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}