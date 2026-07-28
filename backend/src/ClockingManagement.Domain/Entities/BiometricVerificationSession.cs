using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class BiometricVerificationSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;

    public VerificationMethod VerificationMethod { get; set; } =
        VerificationMethod.MockFace;

    public decimal Confidence { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public DateTimeOffset? UsedAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}