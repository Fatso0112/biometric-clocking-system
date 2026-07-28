using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Attendance;

public sealed record ClockAttendanceRequest(
    Guid EmployeeId,

    [Required]
    [StringLength(200, MinimumLength = 20)]
    string VerificationToken,

    Guid ClientEventId);

public sealed record AttendanceEventResponse(
    Guid Id,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string EventType,
    string VerificationMethod,
    decimal? BiometricConfidence,
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
    int CurrentlyPresent,
    int NotPresent,
    IReadOnlyCollection<AttendanceEventResponse>
        RecentActivity);