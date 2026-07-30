using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class BiometricRegistrationRequest
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } =
        null!;

    public Guid RequestedByUserId { get; set; }

    public BiometricModality RequestedModality
        { get; set; }

    public BiometricRegistrationRequestStatus Status
        { get; set; } =
            BiometricRegistrationRequestStatus.Pending;

    public string? Reason { get; set; }

    public DateTimeOffset RequestedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public Guid? ReviewedByUserId { get; set; }

    public DateTimeOffset? ReviewedAtUtc { get; set; }

    public string? ReviewNotes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }
}