using ClockingManagement.Domain.Entities;

namespace ClockingManagement.Application.Attendance;

public sealed record AttendanceDayCalculation(
    string Status,
    DateTimeOffset? ClockInAtUtc,
    DateTimeOffset? BreakStartedAtUtc,
    DateTimeOffset? BreakEndedAtUtc,
    DateTimeOffset? ClockOutAtUtc,
    int TotalBreakMinutes,
    int WorkedMinutes,
    bool HasOpenBreak,
    bool HasOpenSession,
    bool HasInvalidSequence);

public interface IAttendanceSessionCalculator
{
    AttendanceDayCalculation Calculate(
        IReadOnlyCollection<AttendanceEvent> events,
        DateTimeOffset effectiveCurrentUtc);
}