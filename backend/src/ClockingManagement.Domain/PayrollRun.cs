using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class PayrollRun
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    public DateTimeOffset RunDateUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public PayrollRunStatus Status { get; set; } =
        PayrollRunStatus.Draft;

    public Guid CreatedByUserId { get; set; }

    public Guid? ApprovedByUserId { get; set; }

    public DateTimeOffset? ApprovedAtUtc { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public ICollection<PayrollEntry> Entries { get; set; } =
        new List<PayrollEntry>();
}
