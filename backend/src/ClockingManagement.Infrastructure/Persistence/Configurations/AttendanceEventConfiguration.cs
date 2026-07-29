using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class AttendanceEventConfiguration
    : IEntityTypeConfiguration<AttendanceEvent>
{
    public void Configure(
        EntityTypeBuilder<AttendanceEvent> builder)
    {
        builder.ToTable(
            "attendance_events",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_attendance_events_confidence",
                    "biometric_confidence IS NULL OR " +
                    "(biometric_confidence >= 0 AND " +
                    "biometric_confidence <= 100)");

                table.HasCheckConstraint(
                    "ck_attendance_events_latitude",
                    "latitude IS NULL OR " +
                    "(latitude >= -90 AND latitude <= 90)");

                table.HasCheckConstraint(
                    "ck_attendance_events_longitude",
                    "longitude IS NULL OR " +
                    "(longitude >= -180 AND longitude <= 180)");

                table.HasCheckConstraint(
                    "ck_attendance_events_location_accuracy",
                    "location_accuracy_metres IS NULL OR " +
                    "location_accuracy_metres >= 0");

                table.HasCheckConstraint(
                    "ck_attendance_events_distance",
                    "distance_from_work_location_metres " +
                    "IS NULL OR " +
                    "distance_from_work_location_metres >= 0");
            });

        builder.HasKey(attendanceEvent => attendanceEvent.Id);

        builder.Property(attendanceEvent => attendanceEvent.Id)
            .HasColumnName("id");

        builder.Property(attendanceEvent => attendanceEvent.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(attendanceEvent => attendanceEvent.EventType)
            .HasColumnName("event_type")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.BiometricVerificationSessionId)
            .HasColumnName(
                "biometric_verification_session_id");

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.VerificationMethod)
            .HasColumnName("verification_method")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.BiometricConfidence)
            .HasColumnName("biometric_confidence")
            .HasPrecision(5, 2);

        builder.Property(attendanceEvent => attendanceEvent.ClientEventId)
            .HasColumnName("client_event_id")
            .IsRequired();

        builder.Property(attendanceEvent => attendanceEvent.CapturedAtUtc)
            .HasColumnName("captured_at_utc")
            .IsRequired();

        builder.Property(attendanceEvent => attendanceEvent.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(attendanceEvent => attendanceEvent.Notes)
            .HasColumnName("notes")
            .HasMaxLength(500);

        builder.HasIndex(attendanceEvent =>
                attendanceEvent.ClientEventId)
            .IsUnique()
            .HasDatabaseName(
                "ux_attendance_events_client_event_id");

        builder.HasIndex(attendanceEvent =>
                attendanceEvent.BiometricVerificationSessionId)
            .IsUnique()
            .HasFilter(
                "biometric_verification_session_id IS NOT NULL")
            .HasDatabaseName(
                "ux_attendance_events_verification_session");

        builder.HasIndex(attendanceEvent => new
            {
                attendanceEvent.EmployeeId,
                attendanceEvent.CapturedAtUtc
            })
            .HasDatabaseName(
                "ix_attendance_events_employee_captured_at");

        builder.HasOne(attendanceEvent =>
                attendanceEvent.Employee)
            .WithMany(employee =>
                employee.AttendanceEvents)
            .HasForeignKey(attendanceEvent =>
                attendanceEvent.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(attendanceEvent =>
                attendanceEvent.BiometricVerificationSession)
            .WithMany()
            .HasForeignKey(attendanceEvent =>
                attendanceEvent.BiometricVerificationSessionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(attendanceEvent => attendanceEvent.IpAddress)
            .HasColumnName("ip_address")
            .HasMaxLength(45);

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.IsAllowedNetwork)
            .HasColumnName("is_allowed_network");

        builder.Property(attendanceEvent => attendanceEvent.Latitude)
            .HasColumnName("latitude")
            .HasPrecision(9, 6);

        builder.Property(attendanceEvent => attendanceEvent.Longitude)
            .HasColumnName("longitude")
            .HasPrecision(9, 6);

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.LocationAccuracyMetres)
            .HasColumnName("location_accuracy_metres")
            .HasPrecision(8, 2);

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.LocationCapturedAtUtc)
            .HasColumnName("location_captured_at_utc");

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.DistanceFromWorkLocationMetres)
            .HasColumnName(
                "distance_from_work_location_metres")
            .HasPrecision(10, 2);

        builder.Property(
                attendanceEvent =>
                    attendanceEvent.IsInsideGeofence)
            .HasColumnName("is_inside_geofence");
            }
}