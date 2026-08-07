using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Application.Payroll;

public sealed record CreatePayrollRunRequest(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    string? Notes);

public sealed record CreatePayrollRunCommand(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    Guid CreatedByUserId,
    string? Notes);

public sealed record PayrollRunQuery(
    DateOnly? PeriodFrom,
    DateOnly? PeriodTo,
    PayrollRunStatus? Status,
    int Page,
    int PageSize);

public sealed record PagedPayrollRunsResult(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<PayrollRunListItemResult> Items);

public sealed record PayrollRunListItemResult(
    Guid Id,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    DateTimeOffset RunDateUtc,
    string Status,
    int EmployeeCount,
    int ExceptionCount,
    decimal TotalHours,
    decimal TotalGrossPay,
    Guid CreatedByUserId,
    Guid? ApprovedByUserId,
    DateTimeOffset? ApprovedAtUtc,
    string? Notes);

public sealed record PayrollRunResult(
    Guid Id,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    DateTimeOffset RunDateUtc,
    string Status,
    int EmployeeCount,
    int ExceptionCount,
    decimal TotalHours,
    decimal TotalGrossPay,
    Guid CreatedByUserId,
    Guid? ApprovedByUserId,
    DateTimeOffset? ApprovedAtUtc,
    string? Notes,
    IReadOnlyCollection<PayrollEntryResult> Entries);

public sealed record PayrollEntryResult(
    Guid Id,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    Guid DepartmentId,
    string DepartmentName,
    int WorkedMinutes,
    int BreakMinutes,
    decimal HoursWorked,
    decimal? RateApplied,
    decimal? GrossPay,
    bool HasExceptions,
    string? Notes);

public sealed record EmployeePayrollCalculationResult(
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    Guid DepartmentId,
    string DepartmentName,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    int WorkedMinutes,
    int BreakMinutes,
    decimal HoursWorked,
    decimal? RateApplied,
    decimal? GrossPay,
    bool HasExceptions,
    string? Notes);

public sealed record EmployeePayrollSummaryResult(
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    Guid DepartmentId,
    string DepartmentName,
    DateOnly? PeriodFrom,
    DateOnly? PeriodTo,
    bool ApprovedOnly,
    int PayrollRunCount,
    int ExceptionCount,
    decimal TotalHours,
    decimal TotalGrossPay,
    IReadOnlyCollection<EmployeePayrollSummaryEntryResult> Entries);

public sealed record EmployeePayrollSummaryEntryResult(
    Guid PayrollRunId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    DateTimeOffset RunDateUtc,
    string RunStatus,
    decimal HoursWorked,
    decimal? RateApplied,
    decimal? GrossPay,
    bool HasExceptions,
    string? Notes);

public sealed record PayRateLookupResult(
    Guid EmployeeId,
    DateOnly WorkDate,
    bool IsResolved,
    decimal? HourlyRate,
    string? ErrorCode,
    string? Message);

    