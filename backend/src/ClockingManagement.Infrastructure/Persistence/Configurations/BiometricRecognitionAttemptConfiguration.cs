using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class BiometricRecognitionAttemptConfiguration
    : IEntityTypeConfiguration<
        BiometricRecognitionAttempt>
{
    public void Configure(
        EntityTypeBuilder<
            BiometricRecognitionAttempt> builder)
    {
        builder.ToTable(
            "biometric_recognition_attempts");

        builder.HasKey(attempt =>
            attempt.Id);

        builder.Property(attempt =>
                attempt.Id)
            .HasColumnName("id");

        builder.Property(attempt =>
                attempt.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(attempt =>
                attempt.BiometricEnrolmentId)
            .HasColumnName(
                "biometric_enrolment_id");

        builder.Property(attempt =>
                attempt.Modality)
            .HasColumnName("modality")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(attempt =>
                attempt.ProviderName)
            .HasColumnName("provider_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(attempt =>
                attempt.Outcome)
            .HasColumnName("outcome")
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(attempt =>
                attempt.Confidence)
            .HasColumnName("confidence")
            .HasPrecision(5, 4);

        builder.Property(attempt =>
                attempt.FailureCode)
            .HasColumnName("failure_code")
            .HasMaxLength(100);

        builder.Property(attempt =>
                attempt.IpAddress)
            .HasColumnName("ip_address")
            .HasMaxLength(45);

        builder.Property(attempt =>
                attempt.AttemptedAtUtc)
            .HasColumnName(
                "attempted_at_utc")
            .IsRequired();

        builder.HasIndex(attempt =>
                new
                {
                    attempt.EmployeeId,
                    attempt.AttemptedAtUtc
                })
            .HasDatabaseName(
                "ix_biometric_recognition_attempts_employee_time");

        builder.HasOne(attempt =>
                attempt.Employee)
            .WithMany(employee =>
                employee
                    .BiometricRecognitionAttempts)
            .HasForeignKey(attempt =>
                attempt.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(attempt =>
                attempt.BiometricEnrolment)
            .WithMany(enrolment =>
                enrolment.RecognitionAttempts)
            .HasForeignKey(attempt =>
                attempt.BiometricEnrolmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}