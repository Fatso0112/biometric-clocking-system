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
    string Message,
    string? Notes);

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
    int LunchBreakMaximumMinutes,
    DateTimeOffset? LunchBreakEndsAtUtc,
    bool HasTakenLunchBreak);

public sealed record LunchBreakOverrideRequest(
    Guid EmployeeId,

    [Required]
    [RegularExpression(
        "^(Start|End)$",
        ErrorMessage = "Action must be Start or End.")]
    string Action,

    [Required]
    [StringLength(400, MinimumLength = 3)]
    string Reason);

public sealed record LunchBreakOverrideResponse(
    Guid AttendanceEventId,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string DepartmentName,
    string Action,
    string Status,
    DateTimeOffset OccurredAtUtc,
    DateTimeOffset? LunchBreakEndsAtUtc,
    int LunchBreakMaximumMinutes,
    string PerformedByRole,
    Guid PerformedByUserId,
    string Reason);