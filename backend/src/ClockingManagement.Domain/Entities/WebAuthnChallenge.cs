using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class WebAuthnChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    public WebAuthnCeremonyType CeremonyType { get; set; }

    public AttendanceEventType? IntendedEventType { get; set; }

    public string OptionsJson { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public DateTimeOffset? UsedAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}
