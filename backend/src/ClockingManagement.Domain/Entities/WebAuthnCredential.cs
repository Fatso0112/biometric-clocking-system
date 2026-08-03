namespace ClockingManagement.Domain.Entities;

public sealed class WebAuthnCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    public string CredentialId { get; set; } = string.Empty;

    public byte[] PublicKey { get; set; } = Array.Empty<byte>();

    public byte[] UserHandle { get; set; } = Array.Empty<byte>();

    public long SignCount { get; set; }

    public Guid AaGuid { get; set; }

    public string? Transports { get; set; }

    public string DeviceName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? LastUsedAtUtc { get; set; }

    public DateTimeOffset? RevokedAtUtc { get; set; }
}
