namespace ClockingManagement.Domain.Entities;

public sealed class PayrollEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PayrollRunId { get; set; }

    public PayrollRun PayrollRun { get; set; } = null!;

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    // Exact duration retained for auditing and recalculation.
    public int WorkedMinutes { get; set; }

    public int BreakMinutes { get; set; }

    // Payroll snapshot rounded by the service when the run is created.
    public decimal HoursWorked { get; set; }

    // Nullable so missing-rate entries are not silently paid at R0.00.
    public decimal? RateApplied { get; set; }

    public decimal? GrossPay { get; set; }

    public bool HasExceptions { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;
}
