namespace ClockingManagement.Infrastructure.Identity;

public sealed class RefreshToken
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid UserId { get; set; }

    public ApplicationUser User { get; set; } =
        null!;

    public string TokenHash { get; set; } =
        string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public DateTimeOffset? RevokedAtUtc { get; set; }

    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIpAddress { get; set; }

    public string? RevokedByIpAddress { get; set; }
}