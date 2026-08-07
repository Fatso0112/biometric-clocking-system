using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Attendance;

public sealed record ClockAttendanceRequest(
    Guid EmployeeId,

    [Required]
    [StringLength(200, MinimumLength = 20)]
    string VerificationToken,

    Guid ClientEventId,

    [Range(-90, 90)]
    decimal Latitude,

    [Range(-180, 180)]
    decimal Longitude,

    [Range(0.1, 10_000)]
    decimal LocationAccuracyMetres,

    DateTimeOffset LocationCapturedAtUtc);

public sealed record AttendanceEventResponse(
    Guid Id,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string EventType,
    string VerificationMethod,
    decimal? BiometricConfidence,
    string? IpAddress,
    bool? IsAllowedNetwork,
    decimal? DistanceFromWorkLocationMetres,
    bool? IsInsideGeofence,
    DateTimeOffset CapturedAtUtc,
    string Message);

public sealed record CurrentAttendanceStatusResponse(
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string Status,
    string? LastEventType,
    DateTimeOffset? LastEventAtUtc);

public sealed record AttendanceDashboardResponse(
    int RegisteredEmployees,
    int CurrentlyWorking,
    int OnBreak,
    int Completed,
    int NotPresent,
    int MissingClockOut,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyCollection<
    AttendanceEventResponse> RecentActivity);

public sealed record TodayAttendanceSummaryResponse(
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    DateOnly WorkDate,
    string TimeZoneId,
    string Status,
    DateTimeOffset? ClockInAtUtc,
    DateTimeOffset? BreakStartedAtUtc,
    DateTimeOffset? BreakEndedAtUtc,
    DateTimeOffset? ClockOutAtUtc,
    int LunchDurationMinutes,
    int WorkedDurationMinutes,
    bool HasOpenBreak,
    bool HasMissingClockOut,
    bool HasInvalidSequence,
    DateTimeOffset LunchBreakStartsAtUtc,
    DateTimeOffset LunchBreakEndsAtUtc,
    bool HasTakenLunchBreak);