using ClockingManagement.Application.WorkLocations;

namespace ClockingManagement.Infrastructure.Time;

public sealed class SystemWorkdayTimeService
    : IWorkdayTimeService
{
    public bool TryNormalizeTimeZoneId(
        string value,
        out string normalizedTimeZoneId)
    {
        normalizedTimeZoneId = string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var candidate = value.Trim();

        if (!TryResolveTimeZone(
                candidate,
                out _))
        {
            return false;
        }

        if (TimeZoneInfo.TryConvertWindowsIdToIanaId(
                candidate,
                out var ianaId))
        {
            normalizedTimeZoneId = ianaId;
        }
        else
        {
            normalizedTimeZoneId = candidate;
        }

        return true;
    }

    public WorkdayBoundary GetCurrentWorkday(
        string timeZoneId,
        DateTimeOffset currentUtc)
    {
        var timeZone =
            ResolveTimeZone(timeZoneId);

        var localNow =
            TimeZoneInfo.ConvertTime(
                currentUtc,
                timeZone);

        var localDate =
            DateOnly.FromDateTime(
                localNow.DateTime);

        return GetWorkday(
            timeZoneId,
            localDate);
    }

    public WorkdayBoundary GetWorkday(
        string timeZoneId,
        DateOnly localDate)
    {
        var timeZone =
            ResolveTimeZone(timeZoneId);

        var localStart =
            DateTime.SpecifyKind(
                localDate.ToDateTime(
                    TimeOnly.MinValue),
                DateTimeKind.Unspecified);

        var localEnd =
            DateTime.SpecifyKind(
                localDate
                    .AddDays(1)
                    .ToDateTime(
                        TimeOnly.MinValue),
                DateTimeKind.Unspecified);

        var startUtcDateTime =
            TimeZoneInfo.ConvertTimeToUtc(
                localStart,
                timeZone);

        var endUtcDateTime =
            TimeZoneInfo.ConvertTimeToUtc(
                localEnd,
                timeZone);

        return new WorkdayBoundary(
            LocalDate: localDate,
            StartUtc:
                new DateTimeOffset(
                    startUtcDateTime),
            EndUtc:
                new DateTimeOffset(
                    endUtcDateTime));
    }

    public DateTimeOffset GetUtcForLocalTime(
        string timeZoneId,
        DateOnly localDate,
        TimeOnly localTime)
    {
        var timeZone =
            ResolveTimeZone(timeZoneId);

        var localDateTime =
            DateTime.SpecifyKind(
                localDate.ToDateTime(localTime),
                DateTimeKind.Unspecified);

        if (timeZone.IsInvalidTime(localDateTime))
        {
            throw new InvalidTimeZoneException(
                $"The local time '{localDateTime:yyyy-MM-dd HH:mm:ss}' is invalid in timezone '{timeZoneId}'.");
        }

        var utcDateTime =
            TimeZoneInfo.ConvertTimeToUtc(
                localDateTime,
                timeZone);

        return new DateTimeOffset(utcDateTime);
    }

    private static TimeZoneInfo ResolveTimeZone(
        string timeZoneId)
    {
        if (TryResolveTimeZone(
                timeZoneId,
                out var timeZone))
        {
            return timeZone;
        }

        throw new TimeZoneNotFoundException(
            $"The timezone '{timeZoneId}' could not be resolved.");
    }

    private static bool TryResolveTimeZone(
        string timeZoneId,
        out TimeZoneInfo timeZone)
    {
        try
        {
            timeZone =
                TimeZoneInfo.FindSystemTimeZoneById(
                    timeZoneId);

            return true;
        }
        catch (
            TimeZoneNotFoundException)
        {
            // Try cross-platform conversions below.
        }
        catch (
            InvalidTimeZoneException)
        {
            // Try cross-platform conversions below.
        }

        if (TimeZoneInfo.TryConvertIanaIdToWindowsId(
                timeZoneId,
                out var windowsId))
        {
            try
            {
                timeZone =
                    TimeZoneInfo
                        .FindSystemTimeZoneById(
                            windowsId);

                return true;
            }
            catch (
                TimeZoneNotFoundException)
            {
            }
            catch (
                InvalidTimeZoneException)
            {
            }
        }

        if (TimeZoneInfo.TryConvertWindowsIdToIanaId(
                timeZoneId,
                out var ianaId))
        {
            try
            {
                timeZone =
                    TimeZoneInfo
                        .FindSystemTimeZoneById(
                            ianaId);

                return true;
            }
            catch (
                TimeZoneNotFoundException)
            {
            }
            catch (
                InvalidTimeZoneException)
            {
            }
        }

        timeZone = null!;

        return false;
    }
}