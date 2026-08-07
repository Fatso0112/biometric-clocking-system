namespace ClockingManagement.Domain.Entities;

public sealed class DepartmentPayrollPolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    public decimal BaseSalary { get; set; }

    public decimal ExpectedMonthlyHours { get; set; }

    public decimal OvertimeMultiplier { get; set; } = 1.5m;

    public bool DeductMissingHours { get; set; } = true;

    public bool PayOvertime { get; set; } = true;

    public int StandardBreakMinutesPerDay { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public string? Notes { get; set; }
}