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
    }
}