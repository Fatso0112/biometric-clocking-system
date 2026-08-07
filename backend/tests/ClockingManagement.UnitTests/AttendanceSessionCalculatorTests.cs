using ClockingManagement.Application.Attendance;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;

namespace ClockingManagement.UnitTests;

public sealed class AttendanceSessionCalculatorTests
{
    private readonly AttendanceSessionCalculator _calculator = new();

    [Fact]
    public void Calculate_CompleteDay_SubtractsCompletedBreak()
    {
        var start =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                start),

            CreateEvent(
                AttendanceEventType.BreakStart,
                start.AddHours(4)),

            CreateEvent(
                AttendanceEventType.BreakEnd,
                start.AddHours(4).AddMinutes(30)),

            CreateEvent(
                AttendanceEventType.ClockOut,
                start.AddHours(8)),
        };

        var result =
            _calculator.Calculate(
                events,
                start.AddHours(9));

        Assert.Equal("Completed", result.Status);
        Assert.Equal(30, result.TotalBreakMinutes);
        Assert.Equal(450, result.WorkedMinutes);
        Assert.False(result.HasOpenBreak);
        Assert.False(result.HasOpenSession);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_FlexibleBreakStart_AllowsAnyWorkingTime()
    {
        var clockIn =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var breakStart =
            clockIn.AddHours(2).AddMinutes(17);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                clockIn),

            CreateEvent(
                AttendanceEventType.BreakStart,
                breakStart),
        };

        var result =
            _calculator.Calculate(
                events,
                breakStart.AddMinutes(20));

        Assert.Equal("OnBreak", result.Status);
        Assert.Equal(20, result.TotalBreakMinutes);
        Assert.Equal(137, result.WorkedMinutes);
        Assert.True(result.HasOpenBreak);
        Assert.True(result.HasOpenSession);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_OpenBreak_AutomaticallyEndsAfterOneHour()
    {
        var clockIn =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var breakStart =
            clockIn.AddHours(3).AddMinutes(10);

        var automaticEnd =
            breakStart.AddHours(1);

        var current =
            automaticEnd.AddMinutes(25);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                clockIn),

            CreateEvent(
                AttendanceEventType.BreakStart,
                breakStart),
        };

        var result =
            _calculator.Calculate(
                events,
                current);

        Assert.Equal("Working", result.Status);
        Assert.Equal(60, result.TotalBreakMinutes);
        Assert.Equal(215, result.WorkedMinutes);
        Assert.Equal(
            automaticEnd,
            result.BreakEndedAtUtc);
        Assert.False(result.HasOpenBreak);
        Assert.True(result.HasOpenSession);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_ClockOutAfterAutomaticBreakEnd_CompletesDay()
    {
        var clockIn =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var breakStart =
            clockIn.AddHours(4);

        var clockOut =
            clockIn.AddHours(9);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                clockIn),

            CreateEvent(
                AttendanceEventType.BreakStart,
                breakStart),

            CreateEvent(
                AttendanceEventType.ClockOut,
                clockOut),
        };

        var result =
            _calculator.Calculate(
                events,
                clockOut);

        Assert.Equal("Completed", result.Status);
        Assert.Equal(60, result.TotalBreakMinutes);
        Assert.Equal(480, result.WorkedMinutes);
        Assert.False(result.HasOpenBreak);
        Assert.False(result.HasOpenSession);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_LateManualBreakEndAfterAutoEnd_DoesNotInvalidateDay()
    {
        var clockIn =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var breakStart =
            clockIn.AddHours(4);

        var breakEnd =
            breakStart.AddHours(1).AddMinutes(10);

        var clockOut =
            clockIn.AddHours(9);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                clockIn),

            CreateEvent(
                AttendanceEventType.BreakStart,
                breakStart),

            CreateEvent(
                AttendanceEventType.BreakEnd,
                breakEnd),

            CreateEvent(
                AttendanceEventType.ClockOut,
                clockOut),
        };

        var result =
            _calculator.Calculate(
                events,
                clockOut);

        Assert.Equal("Completed", result.Status);
        Assert.Equal(60, result.TotalBreakMinutes);
        Assert.Equal(480, result.WorkedMinutes);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_SecondLunchBreakStart_ReportsInvalidSequence()
    {
        var clockIn =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.ClockIn,
                clockIn),

            CreateEvent(
                AttendanceEventType.BreakStart,
                clockIn.AddHours(3)),

            CreateEvent(
                AttendanceEventType.BreakEnd,
                clockIn.AddHours(3).AddMinutes(30)),

            CreateEvent(
                AttendanceEventType.BreakStart,
                clockIn.AddHours(5)),
        };

        var result =
            _calculator.Calculate(
                events,
                clockIn.AddHours(5).AddMinutes(10));

        Assert.Equal(
            "InvalidSequence",
            result.Status);

        Assert.True(
            result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_InvalidTransition_ReportsInvalidSequence()
    {
        var start =
            new DateTimeOffset(
                2026, 8, 3, 6, 0, 0,
                TimeSpan.Zero);

        var events = new[]
        {
            CreateEvent(
                AttendanceEventType.BreakStart,
                start),
        };

        var result =
            _calculator.Calculate(
                events,
                start.AddMinutes(15));

        Assert.Equal(
            "InvalidSequence",
            result.Status);

        Assert.True(
            result.HasInvalidSequence);

        Assert.False(
            result.HasOpenSession);
    }

    private static AttendanceEvent CreateEvent(
        AttendanceEventType eventType,
        DateTimeOffset capturedAtUtc)
    {
        return new AttendanceEvent
        {
            EventType = eventType,
            CapturedAtUtc = capturedAtUtc,
            CreatedAtUtc = capturedAtUtc,
            ClientEventId = Guid.NewGuid(),
        };
    }
}
