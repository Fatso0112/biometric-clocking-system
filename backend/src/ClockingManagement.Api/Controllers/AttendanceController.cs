using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/attendance")]
public sealed class AttendanceController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IVerificationTokenService
        _verificationTokenService;

    public AttendanceController(
        ApplicationDbContext dbContext,
        IVerificationTokenService
            verificationTokenService)
    {
        _dbContext = dbContext;
        _verificationTokenService =
            verificationTokenService;
    }

    [HttpPost("clock-in")]
    public Task<ActionResult<AttendanceEventResponse>>
        ClockIn(
            [FromBody] ClockAttendanceRequest request,
            CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.ClockIn,
            cancellationToken);
    }

    [HttpPost("clock-out")]
    public Task<ActionResult<AttendanceEventResponse>>
        ClockOut(
            [FromBody] ClockAttendanceRequest request,
            CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.ClockOut,
            cancellationToken);
    }

    [HttpGet("events/{id:guid}")]
    [ProducesResponseType(
        typeof(AttendanceEventResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AttendanceEventResponse>>
        GetEventById(
            Guid id,
            CancellationToken cancellationToken)
    {
        var attendanceEvent =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(item => item.Id == id)
                .Select(item =>
                    new AttendanceEventResponse(
                        item.Id,
                        item.EmployeeId,
                        item.Employee.EmployeeNumber,
                        item.Employee.FirstName + " " +
                            item.Employee.LastName,
                        item.EventType.ToString(),
                        item.VerificationMethod.ToString(),
                        item.BiometricConfidence,
                        item.CapturedAtUtc,
                        item.EventType ==
                            AttendanceEventType.ClockIn
                            ? "Employee is currently present."
                            : "Employee clocked out successfully."))
                .SingleOrDefaultAsync(
                    cancellationToken);

        if (attendanceEvent is null)
        {
            return NotFound(new
            {
                message =
                    "Attendance event was not found."
            });
        }

        return Ok(attendanceEvent);
    }

    [HttpGet("current/{employeeId:guid}")]
    [ProducesResponseType(
        typeof(CurrentAttendanceStatusResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<
        ActionResult<CurrentAttendanceStatusResponse>>
        GetCurrentStatus(
            Guid employeeId,
            CancellationToken cancellationToken)
    {
        var employee = await _dbContext.Employees
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == employeeId,
                cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message = "Employee was not found."
            });
        }

        var latestEvent =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employeeId)
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .FirstOrDefaultAsync(
                    cancellationToken);

        var status = latestEvent?.EventType ==
                     AttendanceEventType.ClockIn
            ? "Present"
            : "NotPresent";

        var response =
            new CurrentAttendanceStatusResponse(
                employee.Id,
                employee.EmployeeNumber,
                $"{employee.FirstName} {employee.LastName}",
                status,
                latestEvent?.EventType.ToString(),
                latestEvent?.CapturedAtUtc);

        return Ok(response);
    }

    [HttpGet("history")]
    [ProducesResponseType(
        typeof(
            IReadOnlyCollection<
                AttendanceEventResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        IReadOnlyCollection<AttendanceEventResponse>>>
        GetHistory(
            [FromQuery] Guid? employeeId,
            [FromQuery] int limit = 100,
            CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 500);

        var query = _dbContext.AttendanceEvents
            .AsNoTracking()
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(item =>
                item.EmployeeId == employeeId.Value);
        }

        var events = await query
            .OrderByDescending(item =>
                item.CapturedAtUtc)
            .ThenByDescending(item =>
                item.CreatedAtUtc)
            .Take(limit)
            .Select(item =>
                new AttendanceEventResponse(
                    item.Id,
                    item.EmployeeId,
                    item.Employee.EmployeeNumber,
                    item.Employee.FirstName + " " +
                        item.Employee.LastName,
                    item.EventType.ToString(),
                    item.VerificationMethod.ToString(),
                    item.BiometricConfidence,
                    item.CapturedAtUtc,
                    item.EventType ==
                        AttendanceEventType.ClockIn
                        ? "Employee clocked in."
                        : "Employee clocked out."))
            .ToListAsync(cancellationToken);

        return Ok(events);
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(
        typeof(AttendanceDashboardResponse),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        AttendanceDashboardResponse>> GetDashboard(
        CancellationToken cancellationToken)
    {
        var registeredEmployees =
            await _dbContext.Employees
                .AsNoTracking()
                .CountAsync(
                    item => item.IsActive,
                    cancellationToken);

        var currentStatuses =
            await _dbContext.Employees
                .AsNoTracking()
                .Where(employee => employee.IsActive)
                .Select(employee =>
                    employee.AttendanceEvents
                        .OrderByDescending(item =>
                            item.CapturedAtUtc)
                        .ThenByDescending(item =>
                            item.CreatedAtUtc)
                        .Select(item =>
                            (AttendanceEventType?)
                                item.EventType)
                        .FirstOrDefault())
                .ToListAsync(cancellationToken);

        var currentlyPresent =
            currentStatuses.Count(status =>
                status ==
                AttendanceEventType.ClockIn);

        var recentActivity =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .Take(10)
                .Select(item =>
                    new AttendanceEventResponse(
                        item.Id,
                        item.EmployeeId,
                        item.Employee.EmployeeNumber,
                        item.Employee.FirstName + " " +
                            item.Employee.LastName,
                        item.EventType.ToString(),
                        item.VerificationMethod.ToString(),
                        item.BiometricConfidence,
                        item.CapturedAtUtc,
                        item.EventType ==
                            AttendanceEventType.ClockIn
                            ? "Employee clocked in."
                            : "Employee clocked out."))
                .ToListAsync(cancellationToken);

        var response =
            new AttendanceDashboardResponse(
                registeredEmployees,
                currentlyPresent,
                registeredEmployees -
                    currentlyPresent,
                recentActivity);

        return Ok(response);
    }

    private async Task<
        ActionResult<AttendanceEventResponse>>
        RecordAttendanceEventAsync(
            ClockAttendanceRequest request,
            AttendanceEventType eventType,
            CancellationToken cancellationToken)
    {
        if (request.EmployeeId == Guid.Empty)
        {
            return BadRequest(new
            {
                message =
                    "A valid employee ID is required."
            });
        }

        if (request.ClientEventId == Guid.Empty)
        {
            return BadRequest(new
            {
                message =
                    "A valid client event ID is required."
            });
        }

        var employee = await _dbContext.Employees
            .SingleOrDefaultAsync(
                item =>
                    item.Id == request.EmployeeId,
                cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message = "Employee was not found."
            });
        }

        if (!employee.IsActive)
        {
            return Conflict(new
            {
                message =
                    "The employee account is inactive."
            });
        }

        var duplicateClientEvent =
            await _dbContext.AttendanceEvents
                .AnyAsync(
                    item =>
                        item.ClientEventId ==
                        request.ClientEventId,
                    cancellationToken);

        if (duplicateClientEvent)
        {
            return Conflict(new
            {
                message =
                    "This clocking request has already been processed."
            });
        }

        var tokenHash =
            _verificationTokenService.HashToken(
                request.VerificationToken.Trim());

        var verificationSession =
            await _dbContext
                .BiometricVerificationSessions
                .SingleOrDefaultAsync(
                    session =>
                        session.EmployeeId ==
                            request.EmployeeId &&
                        session.TokenHash ==
                            tokenHash,
                    cancellationToken);

        if (verificationSession is null)
        {
            return Unauthorized(new
            {
                message =
                    "The biometric verification token is invalid."
            });
        }

        var now = DateTimeOffset.UtcNow;

        if (verificationSession.UsedAtUtc is not null)
        {
            return Conflict(new
            {
                message =
                    "The biometric verification token has already been used."
            });
        }

        if (verificationSession.ExpiresAtUtc <= now)
        {
            return Unauthorized(new
            {
                message =
                    "The biometric verification token has expired."
            });
        }

        var latestEvent =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employee.Id)
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .FirstOrDefaultAsync(
                    cancellationToken);

        if (eventType ==
                AttendanceEventType.ClockIn &&
            latestEvent?.EventType ==
                AttendanceEventType.ClockIn)
        {
            return Conflict(new
            {
                message =
                    "The employee is already clocked in."
            });
        }

        if (eventType ==
                AttendanceEventType.ClockOut &&
            latestEvent?.EventType !=
                AttendanceEventType.ClockIn)
        {
            return Conflict(new
            {
                message =
                    "The employee must clock in before clocking out."
            });
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        try
        {
            verificationSession.UsedAtUtc = now;

            var attendanceEvent =
                new AttendanceEvent
                {
                    EmployeeId = employee.Id,
                    EventType = eventType,
                    BiometricVerificationSessionId =
                        verificationSession.Id,
                    VerificationMethod =
                        verificationSession
                            .VerificationMethod,
                    BiometricConfidence =
                        verificationSession.Confidence,
                    ClientEventId =
                        request.ClientEventId,
                    CapturedAtUtc = now,
                    CreatedAtUtc = now
                };

            _dbContext.AttendanceEvents.Add(
                attendanceEvent);

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            var message =
                eventType ==
                AttendanceEventType.ClockIn
                    ? "Clock-in successful."
                    : "Clock-out successful.";

            var response =
                new AttendanceEventResponse(
                    attendanceEvent.Id,
                    employee.Id,
                    employee.EmployeeNumber,
                    $"{employee.FirstName} {employee.LastName}",
                    attendanceEvent.EventType.ToString(),
                    attendanceEvent
                        .VerificationMethod.ToString(),
                    attendanceEvent
                        .BiometricConfidence,
                    attendanceEvent.CapturedAtUtc,
                    message);

            return CreatedAtAction(
                nameof(GetEventById),
                new { id = attendanceEvent.Id },
                response);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(
                cancellationToken);

            return Conflict(new
            {
                message =
                    "The clocking request could not be processed because it may already have been submitted."
            });
        }
    }
}