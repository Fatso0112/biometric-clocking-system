using ClockingManagement.Application.WorkLocations;

namespace ClockingManagement.Application.Attendance;

public sealed record LunchBreakWindow(
    DateOnly WorkDate,
    string TimeZoneId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc);

public static class LunchBreakPolicy
{
    public static readonly TimeOnly StartsAt =
        new(12, 0);

    public static readonly TimeOnly EndsAt =
        new(13, 0);

    public static LunchBreakWindow GetWindow(
        IWorkdayTimeService workdayTimeService,
        string timeZoneId,
        DateOnly workDate)
    {
        ArgumentNullException.ThrowIfNull(
            workdayTimeService);

        var startsAtUtc =
            workdayTimeService.GetUtcForLocalTime(
                timeZoneId,
                workDate,
                StartsAt);

        var endsAtUtc =
            workdayTimeService.GetUtcForLocalTime(
                timeZoneId,
                workDate,
                EndsAt);

        return new LunchBreakWindow(
            WorkDate: workDate,
            TimeZoneId: timeZoneId,
            StartsAtUtc: startsAtUtc,
            EndsAtUtc: endsAtUtc);
    }
}
