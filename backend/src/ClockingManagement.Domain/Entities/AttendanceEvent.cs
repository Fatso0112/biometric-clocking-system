using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Domain.Entities;

public sealed class AttendanceEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;

    public AttendanceEventType EventType { get; set; }

    public Guid? BiometricVerificationSessionId { get; set; }

    public BiometricVerificationSession?
        BiometricVerificationSession { get; set; }

    public VerificationMethod VerificationMethod { get; set; }

    public string? IpAddress { get; set; }

    public bool? IsAllowedNetwork { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public decimal? LocationAccuracyMetres { get; set; }

    public DateTimeOffset? LocationCapturedAtUtc { get; set; }

    public decimal? DistanceFromWorkLocationMetres { get; set; }

    public bool? IsInsideGeofence { get; set; }

    public decimal? BiometricConfidence { get; set; }

    public Guid ClientEventId { get; set; }

    public DateTimeOffset CapturedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public string? Notes { get; set; }
}