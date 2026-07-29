using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClockingManagement.Application.WorkLocations;

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

    private readonly IWorkdayTimeService
    _workdayTimeService;

    private readonly IAttendanceSessionCalculator
    _attendanceSessionCalculator;

    public AttendanceController(
        ApplicationDbContext dbContext,
        IVerificationTokenService
            verificationTokenService,
        IClockingLocationValidator
            locationValidator,
        IWorkdayTimeService
            workdayTimeService,
        IAttendanceSessionCalculator
            attendanceSessionCalculator)
    {
        _dbContext = dbContext;
        _verificationTokenService =
            verificationTokenService;
        _locationValidator =
            locationValidator;
        _workdayTimeService =
            workdayTimeService;
        _attendanceSessionCalculator =
            attendanceSessionCalculator;
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

    [HttpGet("today/{employeeId:guid}")]
    [ProducesResponseType(
        typeof(TodayAttendanceSummaryResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<
        TodayAttendanceSummaryResponse>>
        GetTodayAttendance(
            Guid employeeId,
            CancellationToken cancellationToken)
    {
        var employee =
            await _dbContext.Employees
                .AsNoTracking()
                .Include(item =>
                    item.WorkLocation)
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

        var currentUtc =
            DateTimeOffset.UtcNow;

        var currentWorkday =
            _workdayTimeService
                .GetCurrentWorkday(
                    employee.WorkLocation.TimeZoneId,
                    currentUtc);

        var previousWorkday =
            _workdayTimeService.GetWorkday(
                employee.WorkLocation.TimeZoneId,
                currentWorkday.LocalDate.AddDays(-1));

        var attendanceEvents =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Where(attendanceEvent =>
                    attendanceEvent.EmployeeId ==
                        employee.Id &&
                    attendanceEvent.CapturedAtUtc >=
                        previousWorkday.StartUtc &&
                    attendanceEvent.CapturedAtUtc <
                        currentWorkday.EndUtc)
                .OrderBy(attendanceEvent =>
                    attendanceEvent.CapturedAtUtc)
                .ThenBy(attendanceEvent =>
                    attendanceEvent.CreatedAtUtc)
                .ToListAsync(
                    cancellationToken);

        var todayEvents =
            attendanceEvents
                .Where(attendanceEvent =>
                    attendanceEvent.CapturedAtUtc >=
                        currentWorkday.StartUtc &&
                    attendanceEvent.CapturedAtUtc <
                        currentWorkday.EndUtc)
                .ToList();

        var previousDayEvents =
            attendanceEvents
                .Where(attendanceEvent =>
                    attendanceEvent.CapturedAtUtc >=
                        previousWorkday.StartUtc &&
                    attendanceEvent.CapturedAtUtc <
                        previousWorkday.EndUtc)
                .ToList();

        var todayCalculation =
            _attendanceSessionCalculator.Calculate(
                todayEvents,
                currentUtc);

        var previousCalculation =
            _attendanceSessionCalculator.Calculate(
                previousDayEvents,
                previousWorkday.EndUtc);

        var response =
            new TodayAttendanceSummaryResponse(
                EmployeeId:
                    employee.Id,
                EmployeeNumber:
                    employee.EmployeeNumber,
                EmployeeName:
                    $"{employee.FirstName} {employee.LastName}",
                WorkDate:
                    currentWorkday.LocalDate,
                TimeZoneId:
                    employee.WorkLocation.TimeZoneId,
                Status:
                    todayCalculation.Status,
                ClockInAtUtc:
                    todayCalculation.ClockInAtUtc,
                BreakStartedAtUtc:
                    todayCalculation.BreakStartedAtUtc,
                BreakEndedAtUtc:
                    todayCalculation.BreakEndedAtUtc,
                ClockOutAtUtc:
                    todayCalculation.ClockOutAtUtc,
                LunchDurationMinutes:
                    todayCalculation.TotalBreakMinutes,
                WorkedDurationMinutes:
                    todayCalculation.WorkedMinutes,
                HasOpenBreak:
                    todayCalculation.HasOpenBreak,
                HasMissingClockOut:
                    previousCalculation.HasOpenSession,
                HasInvalidSequence:
                    todayCalculation.HasInvalidSequence);

        return Ok(response);
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(
        typeof(AttendanceDashboardResponse),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        AttendanceDashboardResponse>>
        GetDashboard(
            CancellationToken cancellationToken)
    {
        var currentUtc =
            DateTimeOffset.UtcNow;

        var employees =
            await _dbContext.Employees
                .AsNoTracking()
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
            return Ok(
                new AttendanceDashboardResponse(
                    RegisteredEmployees: 0,
                    CurrentlyWorking: 0,
                    OnBreak: 0,
                    Completed: 0,
                    NotPresent: 0,
                    MissingClockOut: 0,
                    GeneratedAtUtc: currentUtc,
                    RecentActivity:
                        Array.Empty<
                            AttendanceEventResponse>()));
        }

        var employeesById =
            employees.ToDictionary(
                employee => employee.Id);

        var workdayBoundaries =
            employees
                .GroupBy(employee =>
                    employee.WorkLocationId)
                .ToDictionary(
                    group => group.Key,
                    group =>
                    {
                        var workLocation =
                            group.First().WorkLocation;

                        var current =
                            _workdayTimeService
                                .GetCurrentWorkday(
                                    workLocation.TimeZoneId,
                                    currentUtc);

                        var previous =
                            _workdayTimeService
                                .GetWorkday(
                                    workLocation.TimeZoneId,
                                    current.LocalDate
                                        .AddDays(-1));

                        return new
                        {
                            Current = current,
                            Previous = previous
                        };
                    });

        var earliestRequiredUtc =
            workdayBoundaries.Values
                .Min(value =>
                    value.Previous.StartUtc);

        var latestRequiredUtc =
            workdayBoundaries.Values
                .Max(value =>
                    value.Current.EndUtc);

        var employeeIds =
            employees
                .Select(employee =>
                    employee.Id)
                .ToHashSet();

        var attendanceEvents =
            await _dbContext.AttendanceEvents
                .AsNoTracking()
                .Include(attendanceEvent =>
                    attendanceEvent.Employee)
                .Where(attendanceEvent =>
                    employeeIds.Contains(
                        attendanceEvent.EmployeeId) &&
                    attendanceEvent.CapturedAtUtc >=
                        earliestRequiredUtc &&
                    attendanceEvent.CapturedAtUtc <
                        latestRequiredUtc)
                .OrderBy(attendanceEvent =>
                    attendanceEvent.CapturedAtUtc)
                .ThenBy(attendanceEvent =>
                    attendanceEvent.CreatedAtUtc)
                .ToListAsync(
                    cancellationToken);

        var eventsByEmployee =
            attendanceEvents
                .GroupBy(attendanceEvent =>
                    attendanceEvent.EmployeeId)
                .ToDictionary(
                    group => group.Key,
                    group =>
                        group.ToList());

        var currentlyWorking = 0;
        var onBreak = 0;
        var completed = 0;
        var notPresent = 0;
        var missingClockOut = 0;

        foreach (var employee in employees)
        {
            var boundaries =
                workdayBoundaries[
                    employee.WorkLocationId];

            eventsByEmployee.TryGetValue(
                employee.Id,
                out var employeeEvents);

            employeeEvents ??=
                new List<AttendanceEvent>();

            var currentDayEvents =
                employeeEvents
                    .Where(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc >=
                            boundaries.Current.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            boundaries.Current.EndUtc)
                    .ToList();

            var previousDayEvents =
                employeeEvents
                    .Where(attendanceEvent =>
                        attendanceEvent.CapturedAtUtc >=
                            boundaries.Previous.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            boundaries.Previous.EndUtc)
                    .ToList();

            var currentCalculation =
                _attendanceSessionCalculator.Calculate(
                    currentDayEvents,
                    currentUtc);

            var previousCalculation =
                _attendanceSessionCalculator.Calculate(
                    previousDayEvents,
                    boundaries.Previous.EndUtc);

            switch (currentCalculation.Status)
            {
                case "Working":
                    currentlyWorking++;
                    break;

                case "OnBreak":
                    onBreak++;
                    break;

                case "Completed":
                    completed++;
                    break;

                case "NotPresent":
                case "InvalidSequence":
                default:
                    notPresent++;
                    break;
            }

            if (previousCalculation.HasOpenSession)
            {
                missingClockOut++;
            }
        }

        var currentDayActivity =
            attendanceEvents
                .Where(attendanceEvent =>
                {
                    var employee =
                        employeesById[
                            attendanceEvent.EmployeeId];

                    var boundaries =
                        workdayBoundaries[
                            employee.WorkLocationId];

                    return
                        attendanceEvent.CapturedAtUtc >=
                            boundaries.Current.StartUtc &&
                        attendanceEvent.CapturedAtUtc <
                            boundaries.Current.EndUtc;
                })
                .OrderByDescending(attendanceEvent =>
                    attendanceEvent.CapturedAtUtc)
                .ThenByDescending(attendanceEvent =>
                    attendanceEvent.CreatedAtUtc)
                .Take(10)
                .Select(ToResponse)
                .ToList();

        var response =
            new AttendanceDashboardResponse(
                RegisteredEmployees:
                    employees.Count,
                CurrentlyWorking:
                    currentlyWorking,
                OnBreak:
                    onBreak,
                Completed:
                    completed,
                NotPresent:
                    notPresent,
                MissingClockOut:
                    missingClockOut,
                GeneratedAtUtc:
                    currentUtc,
                RecentActivity:
                    currentDayActivity);

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