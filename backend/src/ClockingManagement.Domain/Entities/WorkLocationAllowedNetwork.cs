namespace ClockingManagement.Domain.Entities;

public sealed class WorkLocationAllowedNetwork
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid WorkLocationId { get; set; }

    public WorkLocation WorkLocation { get; set; } = null!;

    public string NetworkCidr { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}