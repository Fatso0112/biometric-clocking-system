namespace ClockingManagement.Application.WorkLocations;

public sealed record WorkdayBoundary(
    DateOnly LocalDate,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc);

public interface IWorkdayTimeService
{
    bool TryNormalizeTimeZoneId(
        string value,
        out string normalizedTimeZoneId);

    WorkdayBoundary GetCurrentWorkday(
        string timeZoneId,
        DateTimeOffset currentUtc);

    WorkdayBoundary GetWorkday(
        string timeZoneId,
        DateOnly localDate);

    DateTimeOffset GetUtcForLocalTime(
        string timeZoneId,
        DateOnly localDate,
        TimeOnly localTime);
}