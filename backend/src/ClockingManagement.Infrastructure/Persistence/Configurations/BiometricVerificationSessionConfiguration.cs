using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class BiometricVerificationSessionConfiguration
    : IEntityTypeConfiguration<BiometricVerificationSession>
{
    public void Configure(
        EntityTypeBuilder<BiometricVerificationSession> builder)
    {
        builder.ToTable(
            "biometric_verification_sessions",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_biometric_sessions_confidence",
                    "confidence >= 0 AND confidence <= 100");
            });

        builder.HasKey(session => session.Id);

        builder.Property(session => session.Id)
            .HasColumnName("id");

        builder.Property(session => session.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(session => session.TokenHash)
            .HasColumnName("token_hash")
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(session => session.VerificationMethod)
            .HasColumnName("verification_method")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(session => session.Confidence)
            .HasColumnName("confidence")
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(session => session.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(session => session.UsedAtUtc)
            .HasColumnName("used_at_utc");

        builder.Property(session => session.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(session => session.TokenHash)
            .IsUnique()
            .HasDatabaseName(
                "ux_biometric_sessions_token_hash");

        builder.HasIndex(session => new
            {
                session.EmployeeId,
                session.ExpiresAtUtc
            })
            .HasDatabaseName(
                "ix_biometric_sessions_employee_expiry");

        builder.HasOne(session => session.Employee)
            .WithMany(employee =>
                employee.BiometricVerificationSessions)
            .HasForeignKey(session => session.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}