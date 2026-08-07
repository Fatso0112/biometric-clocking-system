namespace ClockingManagement.Domain.Entities;

public sealed class PayRateHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    public decimal HourlyRate { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    public Guid CreatedByUserId { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}
