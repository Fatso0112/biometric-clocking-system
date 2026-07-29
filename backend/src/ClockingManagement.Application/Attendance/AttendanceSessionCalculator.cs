using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Application.Attendance;

public sealed class AttendanceSessionCalculator
    : IAttendanceSessionCalculator
{
    public AttendanceDayCalculation Calculate(
        IReadOnlyCollection<AttendanceEvent> events,
        DateTimeOffset effectiveCurrentUtc)
    {
        var orderedEvents = events
            .Where(attendanceEvent =>
                attendanceEvent.CapturedAtUtc <=
                effectiveCurrentUtc)
            .OrderBy(attendanceEvent =>
                attendanceEvent.CapturedAtUtc)
            .ThenBy(attendanceEvent =>
                attendanceEvent.CreatedAtUtc)
            .ToList();

        var state = CalculationState.NotPresent;

        var totalWorkedTime = TimeSpan.Zero;
        var totalBreakTime = TimeSpan.Zero;

        DateTimeOffset? workSegmentStartedAt = null;
        DateTimeOffset? openBreakStartedAt = null;

        DateTimeOffset? firstClockInAt = null;
        DateTimeOffset? latestBreakStartedAt = null;
        DateTimeOffset? latestBreakEndedAt = null;
        DateTimeOffset? latestClockOutAt = null;

        var hasClockedIn = false;
        var hasInvalidSequence = false;

        foreach (var attendanceEvent in orderedEvents)
        {
            var eventTime =
                attendanceEvent.CapturedAtUtc;

            switch (attendanceEvent.EventType)
            {
                case AttendanceEventType.ClockIn:
                {
                    if (state !=
                        CalculationState.NotPresent)
                    {
                        hasInvalidSequence = true;
                        continue;
                    }

                    hasClockedIn = true;

                    firstClockInAt ??= eventTime;

                    workSegmentStartedAt =
                        eventTime;

                    openBreakStartedAt = null;

                    state =
                        CalculationState.Working;

                    break;
                }

                case AttendanceEventType.BreakStart:
                {
                    if (state !=
                            CalculationState.Working ||
                        workSegmentStartedAt is null)
                    {
                        hasInvalidSequence = true;
                        continue;
                    }

                    AddDuration(
                        ref totalWorkedTime,
                        workSegmentStartedAt.Value,
                        eventTime);

                    latestBreakStartedAt =
                        eventTime;

                    openBreakStartedAt =
                        eventTime;

                    workSegmentStartedAt = null;

                    state =
                        CalculationState.OnBreak;

                    break;
                }

                case AttendanceEventType.BreakEnd:
                {
                    if (state !=
                            CalculationState.OnBreak ||
                        openBreakStartedAt is null)
                    {
                        hasInvalidSequence = true;
                        continue;
                    }

                    AddDuration(
                        ref totalBreakTime,
                        openBreakStartedAt.Value,
                        eventTime);

                    latestBreakEndedAt =
                        eventTime;

                    openBreakStartedAt = null;

                    workSegmentStartedAt =
                        eventTime;

                    state =
                        CalculationState.Working;

                    break;
                }

                case AttendanceEventType.ClockOut:
                {
                    if (state !=
                            CalculationState.Working ||
                        workSegmentStartedAt is null)
                    {
                        hasInvalidSequence = true;
                        continue;
                    }

                    AddDuration(
                        ref totalWorkedTime,
                        workSegmentStartedAt.Value,
                        eventTime);

                    latestClockOutAt =
                        eventTime;

                    workSegmentStartedAt = null;
                    openBreakStartedAt = null;

                    state =
                        CalculationState.NotPresent;

                    break;
                }

                default:
                {
                    hasInvalidSequence = true;
                    break;
                }
            }
        }

        if (state == CalculationState.Working &&
            workSegmentStartedAt is not null)
        {
            AddDuration(
                ref totalWorkedTime,
                workSegmentStartedAt.Value,
                effectiveCurrentUtc);
        }

        if (state == CalculationState.OnBreak &&
            openBreakStartedAt is not null)
        {
            AddDuration(
                ref totalBreakTime,
                openBreakStartedAt.Value,
                effectiveCurrentUtc);
        }

        var status =
            DetermineStatus(
                hasClockedIn,
                state,
                hasInvalidSequence);

        return new AttendanceDayCalculation(
            Status: status,
            ClockInAtUtc: firstClockInAt,
            BreakStartedAtUtc:
                latestBreakStartedAt,
            BreakEndedAtUtc:
                latestBreakEndedAt,
            ClockOutAtUtc:
                latestClockOutAt,
            TotalBreakMinutes:
                ToWholeMinutes(
                    totalBreakTime),
            WorkedMinutes:
                ToWholeMinutes(
                    totalWorkedTime),
            HasOpenBreak:
                state ==
                CalculationState.OnBreak,
            HasOpenSession:
                state is
                    CalculationState.Working or
                    CalculationState.OnBreak,
            HasInvalidSequence:
                hasInvalidSequence);
    }

    private static string DetermineStatus(
        bool hasClockedIn,
        CalculationState state,
        bool hasInvalidSequence)
    {
        if (hasInvalidSequence)
        {
            return "InvalidSequence";
        }

        if (!hasClockedIn)
        {
            return "NotPresent";
        }

        return state switch
        {
            CalculationState.Working =>
                "Working",

            CalculationState.OnBreak =>
                "OnBreak",

            CalculationState.NotPresent =>
                "Completed",

            _ => "NotPresent"
        };
    }

    private static void AddDuration(
        ref TimeSpan total,
        DateTimeOffset start,
        DateTimeOffset end)
    {
        if (end <= start)
        {
            return;
        }

        total += end - start;
    }

    private static int ToWholeMinutes(
        TimeSpan duration)
    {
        return Math.Max(
            0,
            (int)Math.Floor(
                duration.TotalMinutes));
    }

    private enum CalculationState
    {
        NotPresent = 1,
        Working = 2,
        OnBreak = 3
    }
}