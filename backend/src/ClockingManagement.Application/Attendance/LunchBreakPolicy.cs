namespace ClockingManagement.Application.Attendance;

public static class LunchBreakPolicy
{
    public const int MaximumDurationMinutes = 60;

    public static readonly TimeSpan MaximumDuration =
        TimeSpan.FromMinutes(MaximumDurationMinutes);

    public static DateTimeOffset GetAutomaticEndUtc(
        DateTimeOffset breakStartedAtUtc)
    {
        return breakStartedAtUtc.Add(MaximumDuration);
    }
}
