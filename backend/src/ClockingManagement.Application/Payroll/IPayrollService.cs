namespace ClockingManagement.Application.Payroll;

public interface IPayrollService
{
    Task<PayrollRunResult> CreatePayrollRunAsync(
        CreatePayrollRunCommand command,
        CancellationToken cancellationToken = default);

    Task<PagedPayrollRunsResult> GetPayrollRunsAsync(
        PayrollRunQuery query,
        CancellationToken cancellationToken = default);

    Task<PayrollRunResult?> GetPayrollRunAsync(
        Guid payrollRunId,
        CancellationToken cancellationToken = default);

    Task<PayrollRunResult> ApprovePayrollRunAsync(
        Guid payrollRunId,
        Guid approvedByUserId,
        CancellationToken cancellationToken = default);

    Task<EmployeePayrollSummaryResult>
        GetEmployeePayrollSummaryAsync(
            Guid employeeId,
            DateOnly? periodFrom,
            DateOnly? periodTo,
            bool approvedOnly,
            CancellationToken cancellationToken = default);

    Task<EmployeePayrollCalculationResult>
        CalculateEmployeeAsync(
            Guid employeeId,
            DateOnly periodStart,
            DateOnly periodEnd,
            CancellationToken cancellationToken = default);

    Task<PayRateLookupResult> GetPayRateForDateAsync(
        Guid employeeId,
        DateOnly workDate,
        CancellationToken cancellationToken = default);
}