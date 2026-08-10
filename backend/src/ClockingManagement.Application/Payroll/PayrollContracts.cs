namespace ClockingManagement.Application.Payroll;

public sealed record PayrollCalculationRequest(
    Guid EmployeeId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd);

public sealed record PayrollCalculationResult(
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    Guid DepartmentId,

    decimal BaseSalary,
    decimal ExpectedMonthlyHours,
    decimal ActualWorkedHours,

    decimal HourlyRate,

    decimal MissingHours,
    decimal MissingHoursDeduction,

    decimal OvertimeHours,
    decimal OvertimeRate,
    decimal OvertimePay,

    decimal FinalSalary);