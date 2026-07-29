using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/attendance")]
public sealed class AttendanceController
    : ControllerBase
{
    private readonly ApplicationDbContext
        _dbContext;

    private readonly IVerificationTokenService
        _verificationTokenService;

    private readonly IClockingLocationValidator
        _locationValidator;

    public AttendanceController(
        ApplicationDbContext dbContext,
        IVerificationTokenService
            verificationTokenService,
        IClockingLocationValidator
            locationValidator)
    {
        _dbContext = dbContext;
        _verificationTokenService =
            verificationTokenService;
        _locationValidator =
            locationValidator;
    }

    [HttpPost("clock-in")]
    public Task<ActionResult<
        AttendanceEventResponse>> ClockIn(
        [FromBody] ClockAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.ClockIn,
            cancellationToken);
    }

    [HttpPost("break/start")]
    public Task<ActionResult<
        AttendanceEventResponse>> StartBreak(
        [FromBody] ClockAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.BreakStart,
            cancellationToken);
    }

    [HttpPost("break/end")]
    public Task<ActionResult<
        AttendanceEventResponse>> EndBreak(
        [FromBody] ClockAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.BreakEnd,
            cancellationToken);
    }

    [HttpPost("clock-out")]
    public Task<ActionResult<
        AttendanceEventResponse>> ClockOut(
        [FromBody] ClockAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        return RecordAttendanceEventAsync(
            request,
            AttendanceEventType.ClockOut,
            cancellationToken);
    }

    [HttpGet("events/{id:guid}")]
    public async Task<ActionResult<
        AttendanceEventResponse>> GetEventById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var item = await _dbContext
            .AttendanceEvents
            .AsNoTracking()
            .Include(attendanceEvent =>
                attendanceEvent.Employee)
            .SingleOrDefaultAsync(
                attendanceEvent =>
                    attendanceEvent.Id == id,
                cancellationToken);

        if (item is null)
        {
            return NotFound(new
            {
                message =
                    "Attendance event was not found."
            });
        }

        return Ok(ToResponse(item));
    }

    [HttpGet("current/{employeeId:guid}")]
    public async Task<ActionResult<
        CurrentAttendanceStatusResponse>>
        GetCurrentStatus(
            Guid employeeId,
            CancellationToken cancellationToken)
    {
        var employee =
            await _dbContext.Employees
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == employeeId,
                    cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message =
                    "Employee was not found."
            });
        }

        var latestEvent =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId ==
                    employeeId)
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .FirstOrDefaultAsync(
                    cancellationToken);

        var response =
            new CurrentAttendanceStatusResponse(
                employee.Id,
                employee.EmployeeNumber,
                $"{employee.FirstName} {employee.LastName}",
                GetCurrentStatus(
                    latestEvent?.EventType),
                latestEvent?.EventType.ToString(),
                latestEvent?.CapturedAtUtc);

        return Ok(response);
    }

    [HttpGet("history")]
    public async Task<ActionResult<
        IReadOnlyCollection<
            AttendanceEventResponse>>> GetHistory(
        [FromQuery] Guid? employeeId,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 500);

        var query =
            _dbContext.AttendanceEvents
                .AsNoTracking()
                .Include(item =>
                    item.Employee)
                .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(item =>
                item.EmployeeId ==
                employeeId.Value);
        }

        var items = await query
            .OrderByDescending(item =>
                item.CapturedAtUtc)
            .ThenByDescending(item =>
                item.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Ok(
            items.Select(ToResponse).ToList());
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<
        AttendanceDashboardResponse>>
        GetDashboard(
            CancellationToken cancellationToken)
    {
        var registeredEmployees =
            await _dbContext.Employees
                .AsNoTracking()
                .CountAsync(
                    employee =>
                        employee.IsActive,
                    cancellationToken);

        var currentStatuses =
            await _dbContext.Employees
                .AsNoTracking()
                .Where(employee =>
                    employee.IsActive)
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

        var currentlyWorking =
            currentStatuses.Count(status =>
                status ==
                    AttendanceEventType.ClockIn ||
                status ==
                    AttendanceEventType.BreakEnd);

        var onBreak =
            currentStatuses.Count(status =>
                status ==
                    AttendanceEventType.BreakStart);

        var recentItems =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Include(item =>
                    item.Employee)
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .Take(10)
                .ToListAsync(cancellationToken);

        var response =
            new AttendanceDashboardResponse(
                RegisteredEmployees:
                    registeredEmployees,
                CurrentlyWorking:
                    currentlyWorking,
                OnBreak: onBreak,
                NotPresent:
                    registeredEmployees -
                    currentlyWorking -
                    onBreak,
                RecentActivity:
                    recentItems
                        .Select(ToResponse)
                        .ToList());

        return Ok(response);
    }

    private async Task<ActionResult<
        AttendanceEventResponse>>
        RecordAttendanceEventAsync(
            ClockAttendanceRequest request,
            AttendanceEventType requestedEvent,
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

        if (request.ClientEventId ==
            Guid.Empty)
        {
            return BadRequest(new
            {
                message =
                    "A valid client event ID is required."
            });
        }

        var employee =
            await _dbContext.Employees
                .Include(item =>
                    item.WorkLocation)
                .ThenInclude(location =>
                    location.AllowedNetworks)
                .SingleOrDefaultAsync(
                    item =>
                        item.Id ==
                        request.EmployeeId,
                    cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message =
                    "Employee was not found."
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

        var duplicateRequest =
            await _dbContext.AttendanceEvents
                .AnyAsync(
                    item =>
                        item.ClientEventId ==
                        request.ClientEventId,
                    cancellationToken);

        if (duplicateRequest)
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
                            employee.Id &&
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

        var now =
            DateTimeOffset.UtcNow;

        if (verificationSession.UsedAtUtc
            is not null)
        {
            return Conflict(new
            {
                message =
                    "The biometric verification token has already been used."
            });
        }

        if (verificationSession.ExpiresAtUtc <=
            now)
        {
            return Unauthorized(new
            {
                message =
                    "The biometric verification token has expired."
            });
        }

        var locationResult =
            _locationValidator.Validate(
                employee.WorkLocation,
                HttpContext.Connection
                    .RemoteIpAddress,
                new ClockingLocationInput(
                    request.Latitude,
                    request.Longitude,
                    request
                        .LocationAccuracyMetres,
                    request
                        .LocationCapturedAtUtc));

        if (!locationResult.IsAllowed)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        locationResult
                            .FailureMessage,
                    ipAddress =
                        locationResult.IpAddress,
                    isAllowedNetwork =
                        locationResult
                            .IsAllowedNetwork,
                    distanceFromOfficeMetres =
                        locationResult
                            .DistanceFromWorkLocationMetres,
                    isInsideGeofence =
                        locationResult
                            .IsInsideGeofence
                });
        }

        var latestEvent =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId ==
                    employee.Id)
                .OrderByDescending(item =>
                    item.CapturedAtUtc)
                .ThenByDescending(item =>
                    item.CreatedAtUtc)
                .FirstOrDefaultAsync(
                    cancellationToken);

        var transitionError =
            GetTransitionError(
                latestEvent?.EventType,
                requestedEvent);

        if (transitionError is not null)
        {
            return Conflict(new
            {
                message = transitionError
            });
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        try
        {
            verificationSession.UsedAtUtc =
                now;

            var attendanceEvent =
                new AttendanceEvent
                {
                    EmployeeId =
                        employee.Id,
                    EventType =
                        requestedEvent,
                    BiometricVerificationSessionId =
                        verificationSession.Id,
                    VerificationMethod =
                        verificationSession
                            .VerificationMethod,
                    BiometricConfidence =
                        verificationSession
                            .Confidence,
                    ClientEventId =
                        request.ClientEventId,
                    IpAddress =
                        locationResult.IpAddress,
                    IsAllowedNetwork =
                        locationResult
                            .IsAllowedNetwork,
                    Latitude =
                        request.Latitude,
                    Longitude =
                        request.Longitude,
                    LocationAccuracyMetres =
                        request
                            .LocationAccuracyMetres,
                    LocationCapturedAtUtc =
                        request
                            .LocationCapturedAtUtc
                            .ToUniversalTime(),
                    DistanceFromWorkLocationMetres =
                        locationResult
                            .DistanceFromWorkLocationMetres,
                    IsInsideGeofence =
                        locationResult
                            .IsInsideGeofence,
                    CapturedAtUtc = now,
                    CreatedAtUtc = now
                };

            _dbContext.AttendanceEvents.Add(
                attendanceEvent);

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            return CreatedAtAction(
                nameof(GetEventById),
                new
                {
                    id = attendanceEvent.Id
                },
                ToResponse(attendanceEvent));
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(
                cancellationToken);

            return Conflict(new
            {
                message =
                    "The attendance event could not be processed because it may already have been submitted."
            });
        }
    }

    private static string? GetTransitionError(
        AttendanceEventType? latestEvent,
        AttendanceEventType requestedEvent)
    {
        return requestedEvent switch
        {
            AttendanceEventType.ClockIn
                when latestEvent is null or
                    AttendanceEventType.ClockOut
                => null,

            AttendanceEventType.ClockIn
                => "The employee is already clocked in.",

            AttendanceEventType.BreakStart
                when latestEvent is
                    AttendanceEventType.ClockIn or
                    AttendanceEventType.BreakEnd
                => null,

            AttendanceEventType.BreakStart
                when latestEvent ==
                    AttendanceEventType.BreakStart
                => "The employee is already on a lunch break.",

            AttendanceEventType.BreakStart
                => "The employee must clock in before starting a lunch break.",

            AttendanceEventType.BreakEnd
                when latestEvent ==
                    AttendanceEventType.BreakStart
                => null,

            AttendanceEventType.BreakEnd
                => "The employee must start a lunch break before ending it.",

            AttendanceEventType.ClockOut
                when latestEvent is
                    AttendanceEventType.ClockIn or
                    AttendanceEventType.BreakEnd
                => null,

            AttendanceEventType.ClockOut
                when latestEvent ==
                    AttendanceEventType.BreakStart
                => "The employee must end the lunch break before clocking out.",

            AttendanceEventType.ClockOut
                => "The employee must clock in before clocking out.",

            _ => "The requested attendance event is not valid."
        };
    }

    private static string GetCurrentStatus(
        AttendanceEventType? eventType)
    {
        return eventType switch
        {
            AttendanceEventType.ClockIn =>
                "Working",

            AttendanceEventType.BreakEnd =>
                "Working",

            AttendanceEventType.BreakStart =>
                "OnBreak",

            _ => "NotPresent"
        };
    }

    private static AttendanceEventResponse
        ToResponse(
            AttendanceEvent item)
    {
        var message =
            item.EventType switch
            {
                AttendanceEventType.ClockIn =>
                    "Clock-in successful.",

                AttendanceEventType.BreakStart =>
                    "Lunch break started.",

                AttendanceEventType.BreakEnd =>
                    "Lunch break ended.",

                AttendanceEventType.ClockOut =>
                    "Clock-out successful.",

                _ =>
                    "Attendance event recorded."
            };

        return new AttendanceEventResponse(
            item.Id,
            item.EmployeeId,
            item.Employee.EmployeeNumber,
            $"{item.Employee.FirstName} {item.Employee.LastName}",
            item.EventType.ToString(),
            item.VerificationMethod.ToString(),
            item.BiometricConfidence,
            item.IpAddress,
            item.IsAllowedNetwork,
            item.DistanceFromWorkLocationMetres,
            item.IsInsideGeofence,
            item.CapturedAtUtc,
            message);
    }
}