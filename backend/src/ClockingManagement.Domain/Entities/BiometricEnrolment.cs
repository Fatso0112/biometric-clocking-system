using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class BiometricEnrolment
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid BiometricProfileId { get; set; }

    public BiometricProfile BiometricProfile
        { get; set; } =
            null!;

    public BiometricModality Modality { get; set; }

    public string ProviderName { get; set; } =
        string.Empty;

    public string ExternalReference { get; set; } =
        string.Empty;

    public string? Label { get; set; }

    public BiometricEnrolmentStatus Status
        { get; set; } =
            BiometricEnrolmentStatus.Active;

    public decimal? QualityScore { get; set; }

    public Guid? CreatedByUserId { get; set; }

    public DateTimeOffset EnrolledAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? DisabledAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public ICollection<BiometricRecognitionAttempt>
        RecognitionAttempts { get; set; } =
            new List<BiometricRecognitionAttempt>();
}