using System.Data;
using System.Security.Claims;
using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/attendance/break")]
[Authorize(
    Roles =
        ApplicationRoles.Supervisor + "," +
        ApplicationRoles.SystemAdministrator)]
public sealed class LunchBreakOverridesController
    : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAttendanceSessionCalculator
        _attendanceSessionCalculator;
    private readonly ClockingManagement.Application.WorkLocations.IWorkdayTimeService
        _workdayTimeService;

    public LunchBreakOverridesController(
        ApplicationDbContext dbContext,
        IAttendanceSessionCalculator
            attendanceSessionCalculator,
        ClockingManagement.Application.WorkLocations.IWorkdayTimeService
            workdayTimeService)
    {
        _dbContext = dbContext;
        _attendanceSessionCalculator =
            attendanceSessionCalculator;
        _workdayTimeService =
            workdayTimeService;
    }

    [HttpPost("override")]
    [EnableRateLimiting("Attendance")]
    [ProducesResponseType(
        typeof(LunchBreakOverrideResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<
        LunchBreakOverrideResponse>> OverrideLunchBreak(
            [FromBody] LunchBreakOverrideRequest request,
            CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "LUNCH_OVERRIDE_USER_NOT_RESOLVED",
                    message =
                        "The authenticated user ID could not be resolved."
                });
        }

        var action =
            request.Action.Trim();

        var reason =
            request.Reason.Trim();

        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        try
        {
            var employee =
                await _dbContext.Employees
                    .Include(item => item.Department)
                    .Include(item => item.WorkLocation)
                    .SingleOrDefaultAsync(
                        item =>
                            item.Id == request.EmployeeId,
                        cancellationToken);

            if (employee is null)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return NotFound(new
                {
                    errorCode =
                        "EMPLOYEE_NOT_FOUND",
                    message =
                        "Employee was not found."
                });
            }

            if (!employee.IsActive)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return Conflict(new
                {
                    errorCode =
                        "EMPLOYEE_INACTIVE",
                    message =
                        "Lunch break overrides cannot be applied to an inactive employee."
                });
            }

            var scopeError =
                await GetScopeErrorAsync(
                    employee,
                    cancellationToken);

            if (scopeError is not null)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    scopeError);
            }

            var now =
                DateTimeOffset.UtcNow;

            var currentWorkday =
                _workdayTimeService.GetCurrentWorkday(
                    employee.WorkLocation.TimeZoneId,
                    now);

            var todayEvents =
                await _dbContext.AttendanceEvents
                    .AsNoTracking()
                    .Where(attendanceEvent =>
                        attendanceEvent.EmployeeId ==
                            employee.Id &&
                        attendanceEvent.CapturedAtUtc >=
                            currentWorkday.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            currentWorkday.EndUtc)
                    .OrderBy(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc)
                    .ThenBy(attendanceEvent =>
                        attendanceEvent.CreatedAtUtc)
                    .ToListAsync(cancellationToken);

            var calculation =
                _attendanceSessionCalculator.Calculate(
                    todayEvents,
                    now);

            if (calculation.HasInvalidSequence)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return Conflict(new
                {
                    errorCode =
                        "CURRENT_DAY_ATTENDANCE_INVALID",
                    message =
                        "The employee's current attendance record contains an invalid sequence and must be reviewed before overriding lunch.",
                    workDate =
                        currentWorkday.LocalDate
                });
            }

            var hasTakenLunchBreak =
                todayEvents.Any(attendanceEvent =>
                    attendanceEvent.EventType ==
                        AttendanceEventType.BreakStart);

            AttendanceEventType eventType;
            string resultingStatus;
            DateTimeOffset? lunchBreakEndsAtUtc;

            if (string.Equals(
                    action,
                    "Start",
                    StringComparison.Ordinal))
            {
                if (hasTakenLunchBreak)
                {
                    await transaction.RollbackAsync(
                        cancellationToken);

                    return Conflict(new
                    {
                        errorCode =
                            "LUNCH_BREAK_ALREADY_TAKEN",
                        message =
                            "The employee has already taken today's lunch break.",
                        workDate =
                            currentWorkday.LocalDate
                    });
                }

                if (!string.Equals(
                        calculation.Status,
                        "Working",
                        StringComparison.Ordinal))
                {
                    await transaction.RollbackAsync(
                        cancellationToken);

                    return Conflict(new
                    {
                        errorCode =
                            "LUNCH_OVERRIDE_START_NOT_ALLOWED",
                        message =
                            "A lunch break can be started only while the employee is currently working.",
                        currentStatus =
                            calculation.Status
                    });
                }

                eventType =
                    AttendanceEventType.BreakStart;

                resultingStatus =
                    "OnBreak";

                lunchBreakEndsAtUtc =
                    LunchBreakPolicy.GetAutomaticEndUtc(
                        now);
            }
            else
            {
                if (!string.Equals(
                        calculation.Status,
                        "OnBreak",
                        StringComparison.Ordinal))
                {
                    await transaction.RollbackAsync(
                        cancellationToken);

                    return Conflict(new
                    {
                        errorCode =
                            hasTakenLunchBreak
                                ? "LUNCH_BREAK_ALREADY_ENDED"
                                : "LUNCH_OVERRIDE_END_NOT_ALLOWED",
                        message =
                            hasTakenLunchBreak
                                ? "The employee's lunch break is no longer active."
                                : "The employee has not started a lunch break today.",
                        currentStatus =
                            calculation.Status
                    });
                }

                eventType =
                    AttendanceEventType.BreakEnd;

                resultingStatus =
                    "Working";

                lunchBreakEndsAtUtc = null;
            }

            var actorRole =
                User.IsInRole(
                    ApplicationRoles.SystemAdministrator)
                    ? ApplicationRoles.SystemAdministrator
                    : ApplicationRoles.Supervisor;

            var attendanceEvent =
                new AttendanceEvent
                {
                    EmployeeId = employee.Id,
                    Employee = employee,
                    EventType = eventType,
                    BiometricVerificationSessionId = null,
                    VerificationMethod =
                        VerificationMethod.Manual,
                    BiometricConfidence = null,
                    ClientEventId = Guid.NewGuid(),
                    IpAddress =
                        HttpContext.Connection
                            .RemoteIpAddress?
                            .ToString(),
                    IsAllowedNetwork = null,
                    Latitude = null,
                    Longitude = null,
                    LocationAccuracyMetres = null,
                    LocationCapturedAtUtc = null,
                    DistanceFromWorkLocationMetres = null,
                    IsInsideGeofence = null,
                    CapturedAtUtc = now,
                    CreatedAtUtc = now,
                    Notes =
                        $"Lunch break override {action.ToLowerInvariant()} by {actorRole} user {currentUserId.Value}. Reason: {reason}"
                };

            _dbContext.AttendanceEvents.Add(
                attendanceEvent);

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            return Ok(
                new LunchBreakOverrideResponse(
                    AttendanceEventId:
                        attendanceEvent.Id,
                    EmployeeId:
                        employee.Id,
                    EmployeeNumber:
                        employee.EmployeeNumber,
                    EmployeeName:
                        $"{employee.FirstName} {employee.LastName}",
                    DepartmentName:
                        employee.Department.Name,
                    Action:
                        action,
                    Status:
                        resultingStatus,
                    OccurredAtUtc:
                        now,
                    LunchBreakEndsAtUtc:
                        lunchBreakEndsAtUtc,
                    LunchBreakMaximumMinutes:
                        LunchBreakPolicy
                            .MaximumDurationMinutes,
                    PerformedByRole:
                        actorRole,
                    PerformedByUserId:
                        currentUserId.Value,
                    Reason:
                        reason));
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(
                cancellationToken);

            return Conflict(new
            {
                errorCode =
                    "LUNCH_OVERRIDE_CONFLICT",
                message =
                    "The lunch break changed while the override was being processed. Refresh attendance and try again."
            });
        }
    }

    private async Task<object?>
        GetScopeErrorAsync(
            Employee targetEmployee,
            CancellationToken cancellationToken)
    {
        if (User.IsInRole(
                ApplicationRoles.SystemAdministrator))
        {
            return null;
        }

        if (!User.IsInRole(
                ApplicationRoles.Supervisor))
        {
            return new
            {
                errorCode =
                    "LUNCH_OVERRIDE_FORBIDDEN",
                message =
                    "You do not have permission to override lunch breaks."
            };
        }

        var supervisorEmployeeId =
            GetAuthenticatedEmployeeId();

        if (!supervisorEmployeeId.HasValue)
        {
            return new
            {
                errorCode =
                    "SUPERVISOR_EMPLOYEE_NOT_LINKED",
                message =
                    "The supervisor account must be linked to an active employee record."
            };
        }

        var supervisorDepartmentId =
            await _dbContext.Employees
                .AsNoTracking()
                .Where(employee =>
                    employee.Id ==
                        supervisorEmployeeId.Value &&
                    employee.IsActive)
                .Select(employee =>
                    (Guid?)employee.DepartmentId)
                .SingleOrDefaultAsync(
                    cancellationToken);

        if (!supervisorDepartmentId.HasValue)
        {
            return new
            {
                errorCode =
                    "SUPERVISOR_DEPARTMENT_NOT_LINKED",
                message =
                    "The supervisor account must be linked to an active department."
            };
        }

        if (targetEmployee.DepartmentId !=
            supervisorDepartmentId.Value)
        {
            return new
            {
                errorCode =
                    "LUNCH_OVERRIDE_DEPARTMENT_FORBIDDEN",
                message =
                    "Supervisors may override lunch breaks only for employees in their own department."
            };
        }

        return null;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out var userId)
                ? userId
                : null;
    }

    private Guid? GetAuthenticatedEmployeeId()
    {
        var employeeIdValue =
            User.FindFirstValue(
                "employee_id");

        return Guid.TryParse(
            employeeIdValue,
            out var employeeId)
                ? employeeId
                : null;
    }
}
