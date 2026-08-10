using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Payroll;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Infrastructure.Payroll;

public sealed class PayrollService : IPayrollService
{
    private readonly ApplicationDbContext _db;
    private readonly IAttendanceSessionCalculator _attendanceCalculator;

    public PayrollService(
        ApplicationDbContext db,
        IAttendanceSessionCalculator attendanceCalculator)
    {
        _db = db;
        _attendanceCalculator = attendanceCalculator;
    }

    public async Task<PayrollCalculationResult> CalculateAsync(
        PayrollCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.PeriodEnd < request.PeriodStart)
        {
            throw new ArgumentException(
                "Payroll period end date cannot be before the start date.");
        }

        var employee = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(
                e => e.Id == request.EmployeeId,
                cancellationToken);

        if (employee is null)
        {
            throw new InvalidOperationException(
                $"Employee '{request.EmployeeId}' was not found.");
        }

        var policy = await _db.DepartmentPayrollPolicies
            .Where(p =>
                p.DepartmentId == employee.DepartmentId &&
                p.IsActive &&
                p.EffectiveFrom <= request.PeriodEnd &&
                (p.EffectiveTo == null ||
                 p.EffectiveTo >= request.PeriodStart))
            .OrderByDescending(p => p.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        if (policy is null)
        {
            throw new InvalidOperationException(
                $"No active payroll policy was found for department " +
                $"'{employee.Department.Name}'.");
        }

        var periodStartUtc = new DateTimeOffset(
            request.PeriodStart.ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);

        var periodEndUtc = new DateTimeOffset(
            request.PeriodEnd.AddDays(1)
                .ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);

        var attendanceEvents = await _db.AttendanceEvents
            .Where(e =>
                e.EmployeeId == employee.Id &&
                e.CapturedAtUtc >= periodStartUtc &&
                e.CapturedAtUtc < periodEndUtc)
            .OrderBy(e => e.CapturedAtUtc)
            .ToListAsync(cancellationToken);

        return CalculatePayroll(
            employee,
            policy,
            attendanceEvents,
            request.PeriodStart,
            request.PeriodEnd);
    }

    private PayrollCalculationResult CalculatePayroll(
        Employee employee,
        DepartmentPayrollPolicy policy,
        IReadOnlyCollection<AttendanceEvent> attendanceEvents,
        DateOnly periodStart,
        DateOnly periodEnd)
    {
        var totalWorkedMinutes = 0;

        for (
            var date = periodStart;
            date <= periodEnd;
            date = date.AddDays(1))
        {
            var dayStartUtc = new DateTimeOffset(
                date.ToDateTime(TimeOnly.MinValue),
                TimeSpan.Zero);

            var dayEndUtc = dayStartUtc.AddDays(1);

            var dayEvents = attendanceEvents
                .Where(e =>
                    e.CapturedAtUtc >= dayStartUtc &&
                    e.CapturedAtUtc < dayEndUtc)
                .ToList();

            if (dayEvents.Count == 0)
            {
                continue;
            }

            var dayCalculation =
                _attendanceCalculator.Calculate(
                    dayEvents,
                    dayEndUtc);

            if (!dayCalculation.HasInvalidSequence)
            {
                totalWorkedMinutes +=
                    dayCalculation.WorkedMinutes;
            }
        }

        var actualWorkedHours =
            totalWorkedMinutes / 60m;

        if (policy.ExpectedMonthlyHours <= 0)
        {
            throw new InvalidOperationException(
                "Expected monthly hours must be greater than zero.");
        }

        if (policy.BaseSalary < 0)
        {
            throw new InvalidOperationException(
                "Base salary cannot be negative.");
        }

        var hourlyRate =
            policy.BaseSalary /
            policy.ExpectedMonthlyHours;

        var missingHours = Math.Max(
            0m,
            policy.ExpectedMonthlyHours -
            actualWorkedHours);

        var missingHoursDeduction =
            policy.DeductMissingHours
                ? missingHours * hourlyRate
                : 0m;

        var overtimeHours = Math.Max(
            0m,
            actualWorkedHours -
            policy.ExpectedMonthlyHours);

        var overtimeRate =
            hourlyRate *
            policy.OvertimeMultiplier;

        var overtimePay =
            policy.PayOvertime
                ? overtimeHours * overtimeRate
                : 0m;

        var finalSalary =
            policy.BaseSalary
            - missingHoursDeduction
            + overtimePay;

        return new PayrollCalculationResult(
            EmployeeId: employee.Id,
            EmployeeNumber: employee.EmployeeNumber,
            EmployeeName:
                $"{employee.FirstName} {employee.LastName}".Trim(),
            DepartmentId: employee.DepartmentId,
            BaseSalary: policy.BaseSalary,
            ExpectedMonthlyHours:
                policy.ExpectedMonthlyHours,
            ActualWorkedHours:
                Math.Round(actualWorkedHours, 2),
            HourlyRate:
                Math.Round(hourlyRate, 2),
            MissingHours:
                Math.Round(missingHours, 2),
            MissingHoursDeduction:
                Math.Round(missingHoursDeduction, 2),
            OvertimeHours:
                Math.Round(overtimeHours, 2),
            OvertimeRate:
                Math.Round(overtimeRate, 2),
            OvertimePay:
                Math.Round(overtimePay, 2),
            FinalSalary:
                Math.Round(finalSalary, 2));
    }
}