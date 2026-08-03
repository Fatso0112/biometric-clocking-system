using ClockingManagement.Application.Attendance;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;

namespace ClockingManagement.UnitTests;

public sealed class AttendanceSessionCalculatorTests
{
    private readonly AttendanceSessionCalculator _calculator = new();

    [Fact]
    public void Calculate_CompleteDay_SubtractsCompletedBreaks()
    {
        var start = new DateTimeOffset(2026, 8, 3, 6, 0, 0, TimeSpan.Zero);
        var events = new[]
        {
            CreateEvent(AttendanceEventType.ClockIn, start),
            CreateEvent(AttendanceEventType.BreakStart, start.AddHours(4)),
            CreateEvent(AttendanceEventType.BreakEnd, start.AddHours(4).AddMinutes(30)),
            CreateEvent(AttendanceEventType.ClockOut, start.AddHours(8)),
        };

        var result = _calculator.Calculate(events, start.AddHours(9));

        Assert.Equal("Completed", result.Status);
        Assert.Equal(30, result.TotalBreakMinutes);
        Assert.Equal(450, result.WorkedMinutes);
        Assert.False(result.HasOpenBreak);
        Assert.False(result.HasOpenSession);
        Assert.False(result.HasInvalidSequence);
    }

    [Fact]
    public void Calculate_OpenBreak_ReportsOnBreakAndExcludesBreakFromWorkedTime()
    {
        var start = new DateTimeOffset(2026, 8, 3, 6, 0, 0, TimeSpan.Zero);
        var events = new[]
        {
            CreateEvent(AttendanceEventType.ClockIn, start),
            CreateEvent(AttendanceEventType.BreakStart, start.AddHours(4)),
        };

        var result = _calculator.Calculate(events, start.AddHours(4).AddMinutes(20));

        Assert.Equal("OnBreak", result.Status);
        Assert.Equal(20, result.TotalBreakMinutes);
        Assert.Equal(240, result.WorkedMinutes);
        Assert.True(result.HasOpenBreak);
        Assert.True(result.HasOpenSession);
    }

    [Fact]
    public void Calculate_InvalidTransition_ReportsInvalidSequence()
    {
        var start = new DateTimeOffset(2026, 8, 3, 6, 0, 0, TimeSpan.Zero);
        var events = new[]
        {
            CreateEvent(AttendanceEventType.BreakStart, start),
        };

        var result = _calculator.Calculate(events, start.AddMinutes(15));

        Assert.Equal("InvalidSequence", result.Status);
        Assert.True(result.HasInvalidSequence);
        Assert.False(result.HasOpenSession);
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
