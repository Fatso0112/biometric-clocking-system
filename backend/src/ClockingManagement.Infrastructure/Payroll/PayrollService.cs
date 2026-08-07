using System.Data;
using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Payroll;
using ClockingManagement.Application.WorkLocations;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Infrastructure.Payroll;

public sealed class PayrollService
    : IPayrollService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAttendanceSessionCalculator
        _attendanceSessionCalculator;
    private readonly IWorkdayTimeService
        _workdayTimeService;

    public PayrollService(
        ApplicationDbContext dbContext,
        IAttendanceSessionCalculator
            attendanceSessionCalculator,
        IWorkdayTimeService workdayTimeService)
    {
        _dbContext = dbContext;
        _attendanceSessionCalculator =
            attendanceSessionCalculator;
        _workdayTimeService =
            workdayTimeService;
    }

    public async Task<PayrollRunResult>
        CreatePayrollRunAsync(
            CreatePayrollRunCommand command,
            CancellationToken cancellationToken = default)
    {
        ValidatePeriod(
            command.PeriodStart,
            command.PeriodEnd);

        if (command.CreatedByUserId == Guid.Empty)
        {
            throw new PayrollValidationException(
                "PAYROLL_CREATOR_REQUIRED",
                "A valid payroll creator user ID is required.");
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

        var overlappingRunExists =
            await _dbContext.PayrollRuns
                .AsNoTracking()
                .AnyAsync(
                    run =>
                        run.Status !=
                            PayrollRunStatus.Cancelled &&
                        run.PeriodStart <=
                            command.PeriodEnd &&
                        run.PeriodEnd >=
                            command.PeriodStart,
                    cancellationToken);

        if (overlappingRunExists)
        {
            throw new PayrollValidationException(
                "PAYROLL_PERIOD_OVERLAP",
                "A non-cancelled payroll run already overlaps the selected period.");
        }

        var employees =
            await _dbContext.Employees
                .AsNoTracking()
                .Include(employee =>
                    employee.Department)
                .Include(employee =>
                    employee.WorkLocation)
                .Where(employee =>
                    employee.IsActive)
                .OrderBy(employee =>
                    employee.EmployeeNumber)
                .ToListAsync(
                    cancellationToken);

        if (employees.Count == 0)
        {
            throw new PayrollValidationException(
                "NO_ACTIVE_EMPLOYEES",
                "No active employees are available for payroll processing.");
        }

        var employeeIds =
            employees
                .Select(employee => employee.Id)
                .ToArray();

        var rates =
            await _dbContext.PayRateHistory
                .AsNoTracking()
                .Where(rate =>
                    employeeIds.Contains(
                        rate.EmployeeId) &&
                    rate.EffectiveFrom <=
                        command.PeriodEnd &&
                    (
                        rate.EffectiveTo == null ||
                        rate.EffectiveTo >=
                            command.PeriodStart
                    ))
                .OrderBy(rate =>
                    rate.EmployeeId)
                .ThenBy(rate =>
                    rate.EffectiveFrom)
                .ToListAsync(
                    cancellationToken);

        var payrollContexts =
            CreateEmployeeContexts(
                employees,
                command.PeriodStart,
                command.PeriodEnd);

        var validContexts =
            payrollContexts
                .Where(context =>
                    context.PeriodStartBoundary is not null &&
                    context.PeriodEndBoundary is not null)
                .ToList();

        var attendanceEvents =
            new List<AttendanceEvent>();

        if (validContexts.Count > 0)
        {
            var earliestRequiredUtc =
                validContexts.Min(context =>
                    context.PeriodStartBoundary!.StartUtc);

            var latestRequiredUtc =
                validContexts.Max(context =>
                    context.PeriodEndBoundary!.EndUtc);

            attendanceEvents =
                await _dbContext.AttendanceEvents
                    .AsNoTracking()
                    .Where(attendanceEvent =>
                        employeeIds.Contains(
                            attendanceEvent.EmployeeId) &&
                        attendanceEvent.CapturedAtUtc >=
                            earliestRequiredUtc &&
                        attendanceEvent.CapturedAtUtc <
                            latestRequiredUtc)
                    .OrderBy(attendanceEvent =>
                        attendanceEvent.EmployeeId)
                    .ThenBy(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc)
                    .ThenBy(attendanceEvent =>
                        attendanceEvent.CreatedAtUtc)
                    .ToListAsync(
                        cancellationToken);
        }

        var eventsByEmployee =
            attendanceEvents
                .GroupBy(attendanceEvent =>
                    attendanceEvent.EmployeeId)
                .ToDictionary(
                    group => group.Key,
                    group =>
                        (IReadOnlyCollection<AttendanceEvent>)
                        group.ToList());

        var ratesByEmployee =
            rates
                .GroupBy(rate => rate.EmployeeId)
                .ToDictionary(
                    group => group.Key,
                    group =>
                        (IReadOnlyCollection<PayRateHistory>)
                        group.ToList());

        var nowUtc = DateTimeOffset.UtcNow;

        var calculations =
            new List<EmployeePayrollCalculation>();

        foreach (var context in payrollContexts)
        {
            eventsByEmployee.TryGetValue(
                context.Employee.Id,
                out var employeeEvents);

            ratesByEmployee.TryGetValue(
                context.Employee.Id,
                out var employeeRates);

            calculations.Add(
                CalculateEmployee(
                    context,
                    command.PeriodStart,
                    command.PeriodEnd,
                    employeeEvents ??
                        Array.Empty<AttendanceEvent>(),
                    employeeRates ??
                        Array.Empty<PayRateHistory>(),
                    nowUtc));
        }

        var hasExceptions =
            calculations.Any(calculation =>
                calculation.HasExceptions);

        var payrollRun = new PayrollRun
        {
            PeriodStart = command.PeriodStart,
            PeriodEnd = command.PeriodEnd,
            RunDateUtc = nowUtc,
            Status = hasExceptions
                ? PayrollRunStatus.PendingReview
                : PayrollRunStatus.Draft,
            CreatedByUserId =
                command.CreatedByUserId,
            Notes = NormalizeNotes(command.Notes),
            CreatedAtUtc = nowUtc
        };

        foreach (var calculation in calculations)
        {
            payrollRun.Entries.Add(
                new PayrollEntry
                {
                    EmployeeId =
                        calculation.Employee.Id,
                    WorkedMinutes =
                        calculation.WorkedMinutes,
                    BreakMinutes =
                        calculation.BreakMinutes,
                    HoursWorked =
                        calculation.HoursWorked,
                    RateApplied =
                        calculation.RateApplied,
                    GrossPay =
                        calculation.GrossPay,
                    HasExceptions =
                        calculation.HasExceptions,
                    Notes = calculation.Notes,
                    CreatedAtUtc = nowUtc
                });
        }

        _dbContext.PayrollRuns.Add(payrollRun);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return ToPayrollRunResult(
            payrollRun,
            calculations);
    }

    public async Task<PagedPayrollRunsResult>
        GetPayrollRunsAsync(
            PayrollRunQuery query,
            CancellationToken cancellationToken = default)
    {
        if (query.PeriodFrom.HasValue &&
            query.PeriodTo.HasValue)
        {
            ValidatePeriod(
                query.PeriodFrom.Value,
                query.PeriodTo.Value);
        }

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(
            query.PageSize,
            1,
            100);

        var payrollQuery =
            _dbContext.PayrollRuns
                .AsNoTracking()
                .AsQueryable();

        if (query.PeriodFrom.HasValue)
        {
            payrollQuery =
                payrollQuery.Where(run =>
                    run.PeriodEnd >=
                        query.PeriodFrom.Value);
        }

        if (query.PeriodTo.HasValue)
        {
            payrollQuery =
                payrollQuery.Where(run =>
                    run.PeriodStart <=
                        query.PeriodTo.Value);
        }

        if (query.Status.HasValue)
        {
            payrollQuery =
                payrollQuery.Where(run =>
                    run.Status == query.Status.Value);
        }

        var totalCount =
            await payrollQuery.CountAsync(
                cancellationToken);

        var pageItems =
            await payrollQuery
                .OrderByDescending(run =>
                    run.PeriodEnd)
                .ThenByDescending(run =>
                    run.RunDateUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(run => new
                {
                    run.Id,
                    run.PeriodStart,
                    run.PeriodEnd,
                    run.RunDateUtc,
                    run.Status,
                    EmployeeCount =
                        run.Entries.Count(),
                    ExceptionCount =
                        run.Entries.Count(entry =>
                            entry.HasExceptions),
                    TotalHours =
                        run.Entries.Sum(entry =>
                            (decimal?)entry.HoursWorked) ??
                                0m,
                    TotalGrossPay =
                        run.Entries.Sum(entry =>
                            entry.GrossPay ?? 0m),
                    run.CreatedByUserId,
                    run.ApprovedByUserId,
                    run.ApprovedAtUtc,
                    run.Notes
                })
                .ToListAsync(cancellationToken);

        var items =
            pageItems
                .Select(run =>
                    new PayrollRunListItemResult(
                        Id: run.Id,
                        PeriodStart: run.PeriodStart,
                        PeriodEnd: run.PeriodEnd,
                        RunDateUtc: run.RunDateUtc,
                        Status: run.Status.ToString(),
                        EmployeeCount:
                            run.EmployeeCount,
                        ExceptionCount:
                            run.ExceptionCount,
                        TotalHours:
                            run.TotalHours,
                        TotalGrossPay:
                            run.TotalGrossPay,
                        CreatedByUserId:
                            run.CreatedByUserId,
                        ApprovedByUserId:
                            run.ApprovedByUserId,
                        ApprovedAtUtc:
                            run.ApprovedAtUtc,
                        Notes: run.Notes))
                .ToList();

        return new PagedPayrollRunsResult(
            Page: page,
            PageSize: pageSize,
            TotalCount: totalCount,
            Items: items);
    }

    public async Task<PayrollRunResult?>
        GetPayrollRunAsync(
            Guid payrollRunId,
            CancellationToken cancellationToken = default)
    {
        if (payrollRunId == Guid.Empty)
        {
            return null;
        }

        var payrollRun =
            await LoadPayrollRunAsync(
                payrollRunId,
                asTracking: false,
                cancellationToken);

        return payrollRun is null
            ? null
            : ToPayrollRunResult(payrollRun);
    }

    public async Task<PayrollRunResult>
        ApprovePayrollRunAsync(
            Guid payrollRunId,
            Guid approvedByUserId,
            CancellationToken cancellationToken = default)
    {
        if (payrollRunId == Guid.Empty)
        {
            throw new PayrollValidationException(
                "PAYROLL_RUN_REQUIRED",
                "A valid payroll run ID is required.");
        }

        if (approvedByUserId == Guid.Empty)
        {
            throw new PayrollValidationException(
                "PAYROLL_APPROVER_REQUIRED",
                "A valid payroll approver user ID is required.");
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

        var payrollRun =
            await LoadPayrollRunAsync(
                payrollRunId,
                asTracking: true,
                cancellationToken);

        if (payrollRun is null)
        {
            throw new PayrollValidationException(
                "PAYROLL_RUN_NOT_FOUND",
                "The selected payroll run was not found.");
        }

        if (payrollRun.Status ==
            PayrollRunStatus.Approved)
        {
            throw new PayrollValidationException(
                "PAYROLL_RUN_ALREADY_APPROVED",
                "The payroll run has already been approved.");
        }

        if (payrollRun.Status ==
            PayrollRunStatus.Cancelled)
        {
            throw new PayrollValidationException(
                "PAYROLL_RUN_CANCELLED",
                "A cancelled payroll run cannot be approved.");
        }

        var hasUnresolvedEntries =
            payrollRun.Status ==
                PayrollRunStatus.PendingReview ||
            payrollRun.Entries.Any(entry =>
                entry.HasExceptions ||
                !entry.RateApplied.HasValue ||
                !entry.GrossPay.HasValue);

        if (hasUnresolvedEntries)
        {
            throw new PayrollValidationException(
                "PAYROLL_RUN_HAS_EXCEPTIONS",
                "The payroll run contains unresolved attendance or pay-rate exceptions and cannot be approved.");
        }

        var nowUtc = DateTimeOffset.UtcNow;

        payrollRun.Status =
            PayrollRunStatus.Approved;
        payrollRun.ApprovedByUserId =
            approvedByUserId;
        payrollRun.ApprovedAtUtc = nowUtc;
        payrollRun.UpdatedAtUtc = nowUtc;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return ToPayrollRunResult(payrollRun);
    }

    public async Task<EmployeePayrollSummaryResult>
        GetEmployeePayrollSummaryAsync(
            Guid employeeId,
            DateOnly? periodFrom,
            DateOnly? periodTo,
            bool approvedOnly,
            CancellationToken cancellationToken = default)
    {
        if (employeeId == Guid.Empty)
        {
            throw new PayrollValidationException(
                "EMPLOYEE_REQUIRED",
                "A valid employee ID is required.");
        }

        if (periodFrom.HasValue &&
            periodTo.HasValue)
        {
            ValidatePeriod(
                periodFrom.Value,
                periodTo.Value);
        }

        var employee =
            await _dbContext.Employees
                .AsNoTracking()
                .Include(item => item.Department)
                .SingleOrDefaultAsync(
                    item => item.Id == employeeId,
                    cancellationToken);

        if (employee is null)
        {
            throw new PayrollValidationException(
                "EMPLOYEE_NOT_FOUND",
                "The selected employee was not found.");
        }

        var entryQuery =
            _dbContext.PayrollEntries
                .AsNoTracking()
                .Where(entry =>
                    entry.EmployeeId == employeeId &&
                    entry.PayrollRun.Status !=
                        PayrollRunStatus.Cancelled);

        if (approvedOnly)
        {
            entryQuery =
                entryQuery.Where(entry =>
                    entry.PayrollRun.Status ==
                        PayrollRunStatus.Approved);
        }

        if (periodFrom.HasValue)
        {
            entryQuery =
                entryQuery.Where(entry =>
                    entry.PayrollRun.PeriodEnd >=
                        periodFrom.Value);
        }

        if (periodTo.HasValue)
        {
            entryQuery =
                entryQuery.Where(entry =>
                    entry.PayrollRun.PeriodStart <=
                        periodTo.Value);
        }

        var entryItems =
            await entryQuery
                .OrderByDescending(entry =>
                    entry.PayrollRun.PeriodEnd)
                .ThenByDescending(entry =>
                    entry.PayrollRun.RunDateUtc)
                .Select(entry => new
                {
                    entry.PayrollRunId,
                    entry.PayrollRun.PeriodStart,
                    entry.PayrollRun.PeriodEnd,
                    entry.PayrollRun.RunDateUtc,
                    entry.PayrollRun.Status,
                    entry.HoursWorked,
                    entry.RateApplied,
                    entry.GrossPay,
                    entry.HasExceptions,
                    entry.Notes
                })
                .ToListAsync(cancellationToken);

        var entries =
            entryItems
                .Select(entry =>
                    new EmployeePayrollSummaryEntryResult(
                        PayrollRunId:
                            entry.PayrollRunId,
                        PeriodStart:
                            entry.PeriodStart,
                        PeriodEnd:
                            entry.PeriodEnd,
                        RunDateUtc:
                            entry.RunDateUtc,
                        RunStatus:
                            entry.Status.ToString(),
                        HoursWorked:
                            entry.HoursWorked,
                        RateApplied:
                            entry.RateApplied,
                        GrossPay:
                            entry.GrossPay,
                        HasExceptions:
                            entry.HasExceptions,
                        Notes: entry.Notes))
                .ToList();

        return new EmployeePayrollSummaryResult(
            EmployeeId: employee.Id,
            EmployeeNumber:
                employee.EmployeeNumber,
            EmployeeName:
                $"{employee.FirstName} {employee.LastName}",
            DepartmentId:
                employee.DepartmentId,
            DepartmentName:
                employee.Department.Name,
            PeriodFrom: periodFrom,
            PeriodTo: periodTo,
            ApprovedOnly: approvedOnly,
            PayrollRunCount: entries.Count,
            ExceptionCount:
                entries.Count(entry =>
                    entry.HasExceptions),
            TotalHours:
                entries.Sum(entry =>
                    entry.HoursWorked),
            TotalGrossPay:
                entries
                    .Where(entry =>
                        entry.GrossPay.HasValue)
                    .Sum(entry =>
                        entry.GrossPay!.Value),
            Entries: entries);
    }

    public async Task<EmployeePayrollCalculationResult>
        CalculateEmployeeAsync(
            Guid employeeId,
            DateOnly periodStart,
            DateOnly periodEnd,
            CancellationToken cancellationToken = default)
    {
        ValidatePeriod(periodStart, periodEnd);

        if (employeeId == Guid.Empty)
        {
            throw new PayrollValidationException(
                "EMPLOYEE_REQUIRED",
                "A valid employee ID is required.");
        }

        var employee =
            await _dbContext.Employees
                .AsNoTracking()
                .Include(item => item.Department)
                .Include(item => item.WorkLocation)
                .SingleOrDefaultAsync(
                    item => item.Id == employeeId,
                    cancellationToken);

        if (employee is null)
        {
            throw new PayrollValidationException(
                "EMPLOYEE_NOT_FOUND",
                "The selected employee was not found.");
        }

        var context =
            CreateEmployeeContext(
                employee,
                periodStart,
                periodEnd);

        IReadOnlyCollection<AttendanceEvent>
            attendanceEvents =
                Array.Empty<AttendanceEvent>();

        if (context.PeriodStartBoundary is not null &&
            context.PeriodEndBoundary is not null)
        {
            attendanceEvents =
                await _dbContext.AttendanceEvents
                    .AsNoTracking()
                    .Where(attendanceEvent =>
                        attendanceEvent.EmployeeId ==
                            employee.Id &&
                        attendanceEvent.CapturedAtUtc >=
                            context.PeriodStartBoundary.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            context.PeriodEndBoundary.EndUtc)
                    .OrderBy(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc)
                    .ThenBy(attendanceEvent =>
                        attendanceEvent.CreatedAtUtc)
                    .ToListAsync(
                        cancellationToken);
        }

        var rates =
            await _dbContext.PayRateHistory
                .AsNoTracking()
                .Where(rate =>
                    rate.EmployeeId == employee.Id &&
                    rate.EffectiveFrom <= periodEnd &&
                    (
                        rate.EffectiveTo == null ||
                        rate.EffectiveTo >= periodStart
                    ))
                .OrderBy(rate => rate.EffectiveFrom)
                .ToListAsync(cancellationToken);

        var calculation =
            CalculateEmployee(
                context,
                periodStart,
                periodEnd,
                attendanceEvents,
                rates,
                DateTimeOffset.UtcNow);

        return ToEmployeeCalculationResult(
            calculation,
            periodStart,
            periodEnd);
    }

    public async Task<PayRateLookupResult>
        GetPayRateForDateAsync(
            Guid employeeId,
            DateOnly workDate,
            CancellationToken cancellationToken = default)
    {
        if (employeeId == Guid.Empty)
        {
            return new PayRateLookupResult(
                EmployeeId: employeeId,
                WorkDate: workDate,
                IsResolved: false,
                HourlyRate: null,
                ErrorCode: "EMPLOYEE_REQUIRED",
                Message:
                    "A valid employee ID is required.");
        }

        var employeeExists =
            await _dbContext.Employees
                .AsNoTracking()
                .AnyAsync(
                    employee =>
                        employee.Id == employeeId,
                    cancellationToken);

        if (!employeeExists)
        {
            return new PayRateLookupResult(
                EmployeeId: employeeId,
                WorkDate: workDate,
                IsResolved: false,
                HourlyRate: null,
                ErrorCode: "EMPLOYEE_NOT_FOUND",
                Message:
                    "The selected employee was not found.");
        }

        var matchingRates =
            await _dbContext.PayRateHistory
                .AsNoTracking()
                .Where(rate =>
                    rate.EmployeeId == employeeId &&
                    rate.EffectiveFrom <= workDate &&
                    (
                        rate.EffectiveTo == null ||
                        rate.EffectiveTo >= workDate
                    ))
                .OrderByDescending(rate =>
                    rate.EffectiveFrom)
                .ToListAsync(cancellationToken);

        return CreateRateLookupResult(
            employeeId,
            workDate,
            matchingRates);
    }

    private EmployeePayrollCalculation
        CalculateEmployee(
            EmployeePayrollContext context,
            DateOnly periodStart,
            DateOnly periodEnd,
            IReadOnlyCollection<AttendanceEvent>
                attendanceEvents,
            IReadOnlyCollection<PayRateHistory> rates,
            DateTimeOffset nowUtc)
    {
        var exceptionMessages =
            new List<string>();

        var informationMessages =
            new List<string>();

        if (!string.IsNullOrWhiteSpace(
                context.SetupException))
        {
            exceptionMessages.Add(
                context.SetupException);

            return CreateCalculation(
                context.Employee,
                workedMinutes: 0,
                breakMinutes: 0,
                rateApplied: null,
                grossPay: null,
                exceptionMessages,
                informationMessages);
        }

        var workedMinutes = 0;
        var breakMinutes = 0;
        var grossPayUnrounded = 0m;
        var grossPayCanBeCalculated = true;

        var appliedRates =
            new List<AppliedRate>();

        for (
            var workDate = periodStart;
            workDate <= periodEnd;
            workDate = workDate.AddDays(1))
        {
            var boundary =
                _workdayTimeService.GetWorkday(
                    context.Employee
                        .WorkLocation.TimeZoneId,
                    workDate);

            var dayEvents =
                attendanceEvents
                    .Where(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc >=
                            boundary.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            boundary.EndUtc)
                    .ToList();

            if (dayEvents.Count == 0)
            {
                continue;
            }

            var effectiveCurrentUtc =
                boundary.EndUtc <= nowUtc
                    ? boundary.EndUtc
                    : nowUtc;

            var lunchBreakWindow =
                LunchBreakPolicy.GetWindow(
                    _workdayTimeService,
                    context.Employee
                        .WorkLocation.TimeZoneId,
                    workDate);

            var dayCalculation =
                _attendanceSessionCalculator.Calculate(
                    dayEvents,
                    effectiveCurrentUtc,
                    lunchBreakWindow.EndsAtUtc);

            if (dayCalculation.HasInvalidSequence)
            {
                exceptionMessages.Add(
                    $"{workDate:yyyy-MM-dd}: invalid attendance sequence. The day was excluded from payroll.");

                grossPayCanBeCalculated = false;
                continue;
            }

            if (dayCalculation.HasOpenSession)
            {
                exceptionMessages.Add(
                    $"{workDate:yyyy-MM-dd}: attendance session is still open or missing a clock-out. The day was excluded from payroll.");

                grossPayCanBeCalculated = false;
                continue;
            }

            if (!string.Equals(
                    dayCalculation.Status,
                    "Completed",
                    StringComparison.Ordinal))
            {
                continue;
            }

            workedMinutes +=
                dayCalculation.WorkedMinutes;

            breakMinutes +=
                dayCalculation.TotalBreakMinutes;

            if (dayCalculation.WorkedMinutes <= 0)
            {
                continue;
            }

            var matchingRates =
                rates
                    .Where(rate =>
                        rate.EffectiveFrom <= workDate &&
                        (
                            rate.EffectiveTo == null ||
                            rate.EffectiveTo >= workDate
                        ))
                    .OrderByDescending(rate =>
                        rate.EffectiveFrom)
                    .ToList();

            if (matchingRates.Count == 0)
            {
                exceptionMessages.Add(
                    $"{workDate:yyyy-MM-dd}: no hourly pay rate is effective for this employee.");

                grossPayCanBeCalculated = false;
                continue;
            }

            if (matchingRates.Count > 1)
            {
                exceptionMessages.Add(
                    $"{workDate:yyyy-MM-dd}: multiple overlapping hourly pay rates are effective.");

                grossPayCanBeCalculated = false;
                continue;
            }

            var hourlyRate =
                matchingRates[0].HourlyRate;

            var exactHours =
                dayCalculation.WorkedMinutes / 60m;

            grossPayUnrounded +=
                exactHours * hourlyRate;

            appliedRates.Add(
                new AppliedRate(
                    WorkDate: workDate,
                    WorkedMinutes:
                        dayCalculation.WorkedMinutes,
                    HourlyRate: hourlyRate));
        }

        decimal? rateApplied = null;
        decimal? grossPay = null;

        if (workedMinutes == 0)
        {
            var periodEndRates =
                rates
                    .Where(rate =>
                        rate.EffectiveFrom <= periodEnd &&
                        (
                            rate.EffectiveTo == null ||
                            rate.EffectiveTo >= periodEnd
                        ))
                    .OrderByDescending(rate =>
                        rate.EffectiveFrom)
                    .ToList();

            if (periodEndRates.Count == 1)
            {
                rateApplied =
                    periodEndRates[0].HourlyRate;

                grossPay = 0m;
            }
            else if (periodEndRates.Count == 0)
            {
                exceptionMessages.Add(
                    $"{periodEnd:yyyy-MM-dd}: no hourly pay rate is effective at the end of the payroll period.");
            }
            else
            {
                exceptionMessages.Add(
                    $"{periodEnd:yyyy-MM-dd}: multiple overlapping hourly pay rates are effective at the end of the payroll period.");
            }
        }
        else if (grossPayCanBeCalculated &&
                 appliedRates.Sum(rate =>
                     rate.WorkedMinutes) == workedMinutes)
        {
            grossPay = Math.Round(
                grossPayUnrounded,
                2,
                MidpointRounding.AwayFromZero);

            var distinctRates =
                appliedRates
                    .Select(rate => rate.HourlyRate)
                    .Distinct()
                    .ToList();

            if (distinctRates.Count == 1)
            {
                rateApplied = distinctRates[0];
            }
            else
            {
                var exactHours =
                    workedMinutes / 60m;

                rateApplied =
                    Math.Round(
                        grossPayUnrounded /
                            exactHours,
                        2,
                        MidpointRounding.AwayFromZero);

                informationMessages.Add(
                    "Multiple historical hourly rates were applied. RateApplied contains the weighted average rate for this payroll entry.");
            }
        }

        return CreateCalculation(
            context.Employee,
            workedMinutes,
            breakMinutes,
            rateApplied,
            grossPay,
            exceptionMessages,
            informationMessages);
    }

    private static EmployeePayrollCalculation
        CreateCalculation(
            Employee employee,
            int workedMinutes,
            int breakMinutes,
            decimal? rateApplied,
            decimal? grossPay,
            IReadOnlyCollection<string>
                exceptionMessages,
            IReadOnlyCollection<string>
                informationMessages)
    {
        var hasExceptions =
            exceptionMessages.Count > 0;

        if (hasExceptions)
        {
            rateApplied = null;
            grossPay = null;
        }

        var notes =
            BuildNotes(
                exceptionMessages,
                informationMessages);

        return new EmployeePayrollCalculation(
            Employee: employee,
            WorkedMinutes: workedMinutes,
            BreakMinutes: breakMinutes,
            HoursWorked:
                Math.Round(
                    workedMinutes / 60m,
                    2,
                    MidpointRounding.AwayFromZero),
            RateApplied: rateApplied,
            GrossPay: grossPay,
            HasExceptions: hasExceptions,
            Notes: notes);
    }

    private IReadOnlyCollection<
        EmployeePayrollContext>
        CreateEmployeeContexts(
            IReadOnlyCollection<Employee> employees,
            DateOnly periodStart,
            DateOnly periodEnd)
    {
        return employees
            .Select(employee =>
                CreateEmployeeContext(
                    employee,
                    periodStart,
                    periodEnd))
            .ToList();
    }

    private EmployeePayrollContext
        CreateEmployeeContext(
            Employee employee,
            DateOnly periodStart,
            DateOnly periodEnd)
    {
        try
        {
            var startBoundary =
                _workdayTimeService.GetWorkday(
                    employee.WorkLocation.TimeZoneId,
                    periodStart);

            var endBoundary =
                _workdayTimeService.GetWorkday(
                    employee.WorkLocation.TimeZoneId,
                    periodEnd);

            return new EmployeePayrollContext(
                Employee: employee,
                PeriodStartBoundary:
                    startBoundary,
                PeriodEndBoundary:
                    endBoundary,
                SetupException: null);
        }
        catch (
            TimeZoneNotFoundException exception)
        {
            return new EmployeePayrollContext(
                Employee: employee,
                PeriodStartBoundary: null,
                PeriodEndBoundary: null,
                SetupException:
                    $"Work-location timezone could not be resolved: {exception.Message}");
        }
        catch (
            InvalidTimeZoneException exception)
        {
            return new EmployeePayrollContext(
                Employee: employee,
                PeriodStartBoundary: null,
                PeriodEndBoundary: null,
                SetupException:
                    $"Work-location timezone is invalid: {exception.Message}");
        }
    }

    private static PayRateLookupResult
        CreateRateLookupResult(
            Guid employeeId,
            DateOnly workDate,
            IReadOnlyCollection<PayRateHistory>
                matchingRates)
    {
        if (matchingRates.Count == 0)
        {
            return new PayRateLookupResult(
                EmployeeId: employeeId,
                WorkDate: workDate,
                IsResolved: false,
                HourlyRate: null,
                ErrorCode: "PAY_RATE_NOT_FOUND",
                Message:
                    "No hourly pay rate is effective for the selected date.");
        }

        if (matchingRates.Count > 1)
        {
            return new PayRateLookupResult(
                EmployeeId: employeeId,
                WorkDate: workDate,
                IsResolved: false,
                HourlyRate: null,
                ErrorCode: "PAY_RATE_OVERLAP",
                Message:
                    "Multiple overlapping hourly pay rates are effective for the selected date.");
        }

        return new PayRateLookupResult(
            EmployeeId: employeeId,
            WorkDate: workDate,
            IsResolved: true,
            HourlyRate:
                matchingRates.Single()
                    .HourlyRate,
            ErrorCode: null,
            Message: null);
    }

    private async Task<PayrollRun?>
        LoadPayrollRunAsync(
            Guid payrollRunId,
            bool asTracking,
            CancellationToken cancellationToken)
    {
        IQueryable<PayrollRun> query =
            _dbContext.PayrollRuns
                .Include(run => run.Entries)
                    .ThenInclude(entry =>
                        entry.Employee)
                    .ThenInclude(employee =>
                        employee.Department);

        if (!asTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.SingleOrDefaultAsync(
            run => run.Id == payrollRunId,
            cancellationToken);
    }

    private static PayrollRunResult
        ToPayrollRunResult(
            PayrollRun payrollRun)
    {
        var entries =
            payrollRun.Entries
                .Select(entry =>
                    new PayrollEntryResult(
                        Id: entry.Id,
                        EmployeeId:
                            entry.EmployeeId,
                        EmployeeNumber:
                            entry.Employee
                                .EmployeeNumber,
                        EmployeeName:
                            $"{entry.Employee.FirstName} {entry.Employee.LastName}",
                        DepartmentId:
                            entry.Employee
                                .DepartmentId,
                        DepartmentName:
                            entry.Employee
                                .Department.Name,
                        WorkedMinutes:
                            entry.WorkedMinutes,
                        BreakMinutes:
                            entry.BreakMinutes,
                        HoursWorked:
                            entry.HoursWorked,
                        RateApplied:
                            entry.RateApplied,
                        GrossPay:
                            entry.GrossPay,
                        HasExceptions:
                            entry.HasExceptions,
                        Notes: entry.Notes))
                .OrderBy(entry =>
                    entry.EmployeeNumber)
                .ToList();

        return new PayrollRunResult(
            Id: payrollRun.Id,
            PeriodStart:
                payrollRun.PeriodStart,
            PeriodEnd:
                payrollRun.PeriodEnd,
            RunDateUtc:
                payrollRun.RunDateUtc,
            Status:
                payrollRun.Status.ToString(),
            EmployeeCount:
                entries.Count,
            ExceptionCount:
                entries.Count(entry =>
                    entry.HasExceptions),
            TotalHours:
                entries.Sum(entry =>
                    entry.HoursWorked),
            TotalGrossPay:
                entries
                    .Where(entry =>
                        entry.GrossPay.HasValue)
                    .Sum(entry =>
                        entry.GrossPay!.Value),
            CreatedByUserId:
                payrollRun.CreatedByUserId,
            ApprovedByUserId:
                payrollRun.ApprovedByUserId,
            ApprovedAtUtc:
                payrollRun.ApprovedAtUtc,
            Notes: payrollRun.Notes,
            Entries: entries);
    }

    private static PayrollRunResult
        ToPayrollRunResult(
            PayrollRun payrollRun,
            IReadOnlyCollection<
                EmployeePayrollCalculation>
                calculations)
    {
        var entries =
            payrollRun.Entries
                .Join(
                    calculations,
                    entry => entry.EmployeeId,
                    calculation =>
                        calculation.Employee.Id,
                    (entry, calculation) =>
                        new PayrollEntryResult(
                            Id: entry.Id,
                            EmployeeId:
                                calculation.Employee.Id,
                            EmployeeNumber:
                                calculation.Employee
                                    .EmployeeNumber,
                            EmployeeName:
                                $"{calculation.Employee.FirstName} {calculation.Employee.LastName}",
                            DepartmentId:
                                calculation.Employee
                                    .DepartmentId,
                            DepartmentName:
                                calculation.Employee
                                    .Department.Name,
                            WorkedMinutes:
                                entry.WorkedMinutes,
                            BreakMinutes:
                                entry.BreakMinutes,
                            HoursWorked:
                                entry.HoursWorked,
                            RateApplied:
                                entry.RateApplied,
                            GrossPay:
                                entry.GrossPay,
                            HasExceptions:
                                entry.HasExceptions,
                            Notes: entry.Notes))
                .OrderBy(entry =>
                    entry.EmployeeNumber)
                .ToList();

        return new PayrollRunResult(
            Id: payrollRun.Id,
            PeriodStart:
                payrollRun.PeriodStart,
            PeriodEnd:
                payrollRun.PeriodEnd,
            RunDateUtc:
                payrollRun.RunDateUtc,
            Status:
                payrollRun.Status.ToString(),
            EmployeeCount:
                entries.Count,
            ExceptionCount:
                entries.Count(entry =>
                    entry.HasExceptions),
            TotalHours:
                entries.Sum(entry =>
                    entry.HoursWorked),
            TotalGrossPay:
                entries
                    .Where(entry =>
                        entry.GrossPay.HasValue)
                    .Sum(entry =>
                        entry.GrossPay!.Value),
            CreatedByUserId:
                payrollRun.CreatedByUserId,
            ApprovedByUserId:
                payrollRun.ApprovedByUserId,
            ApprovedAtUtc:
                payrollRun.ApprovedAtUtc,
            Notes: payrollRun.Notes,
            Entries: entries);
    }

    private static EmployeePayrollCalculationResult
        ToEmployeeCalculationResult(
            EmployeePayrollCalculation calculation,
            DateOnly periodStart,
            DateOnly periodEnd)
    {
        return new EmployeePayrollCalculationResult(
            EmployeeId:
                calculation.Employee.Id,
            EmployeeNumber:
                calculation.Employee.EmployeeNumber,
            EmployeeName:
                $"{calculation.Employee.FirstName} {calculation.Employee.LastName}",
            DepartmentId:
                calculation.Employee.DepartmentId,
            DepartmentName:
                calculation.Employee.Department.Name,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            WorkedMinutes:
                calculation.WorkedMinutes,
            BreakMinutes:
                calculation.BreakMinutes,
            HoursWorked:
                calculation.HoursWorked,
            RateApplied:
                calculation.RateApplied,
            GrossPay:
                calculation.GrossPay,
            HasExceptions:
                calculation.HasExceptions,
            Notes: calculation.Notes);
    }

    private static void ValidatePeriod(
        DateOnly periodStart,
        DateOnly periodEnd)
    {
        if (periodStart == default ||
            periodEnd == default)
        {
            throw new PayrollValidationException(
                "PAYROLL_PERIOD_REQUIRED",
                "A valid payroll start date and end date are required.");
        }

        if (periodEnd < periodStart)
        {
            throw new PayrollValidationException(
                "INVALID_PAYROLL_PERIOD",
                "The payroll period end date cannot be earlier than the start date.");
        }

        if (periodEnd.DayNumber -
                periodStart.DayNumber > 366)
        {
            throw new PayrollValidationException(
                "PAYROLL_PERIOD_TOO_LONG",
                "A payroll period cannot be longer than 367 calendar days.");
        }
    }

    private static string? NormalizeNotes(
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
        {
            return null;
        }

        var normalized = notes.Trim();

        return normalized.Length <= 1000
            ? normalized
            : normalized[..1000];
    }

    private static string? BuildNotes(
        IReadOnlyCollection<string>
            exceptionMessages,
        IReadOnlyCollection<string>
            informationMessages)
    {
        var notes =
            exceptionMessages
                .Select(message =>
                    $"REVIEW: {message}")
                .Concat(
                    informationMessages.Select(
                        message =>
                            $"INFO: {message}"))
                .ToList();

        if (notes.Count == 0)
        {
            return null;
        }

        var combined = string.Join(
            Environment.NewLine,
            notes);

        return combined.Length <= 1000
            ? combined
            : combined[..1000];
    }

    private sealed record EmployeePayrollContext(
        Employee Employee,
        WorkdayBoundary? PeriodStartBoundary,
        WorkdayBoundary? PeriodEndBoundary,
        string? SetupException);

    private sealed record EmployeePayrollCalculation(
        Employee Employee,
        int WorkedMinutes,
        int BreakMinutes,
        decimal HoursWorked,
        decimal? RateApplied,
        decimal? GrossPay,
        bool HasExceptions,
        string? Notes);

    private sealed record AppliedRate(
        DateOnly WorkDate,
        int WorkedMinutes,
        decimal HourlyRate);
}
