using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class BiometricEnrolmentConfiguration
    : IEntityTypeConfiguration<BiometricEnrolment>
{
    public void Configure(
        EntityTypeBuilder<BiometricEnrolment> builder)
    {
        builder.ToTable("biometric_enrolments");

        builder.HasKey(enrolment =>
            enrolment.Id);

        builder.Property(enrolment =>
                enrolment.Id)
            .HasColumnName("id");

        builder.Property(enrolment =>
                enrolment.BiometricProfileId)
            .HasColumnName(
                "biometric_profile_id")
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.Modality)
            .HasColumnName("modality")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.ProviderName)
            .HasColumnName("provider_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.ExternalReference)
            .HasColumnName(
                "external_reference")
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.Label)
            .HasColumnName("label")
            .HasMaxLength(100);

        builder.Property(enrolment =>
                enrolment.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.QualityScore)
            .HasColumnName("quality_score")
            .HasPrecision(5, 4);

        builder.Property(enrolment =>
                enrolment.CreatedByUserId)
            .HasColumnName(
                "created_by_user_id");

        builder.Property(enrolment =>
                enrolment.EnrolledAtUtc)
            .HasColumnName(
                "enrolled_at_utc")
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.DisabledAtUtc)
            .HasColumnName(
                "disabled_at_utc");

        builder.Property(enrolment =>
                enrolment.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(enrolment =>
                enrolment.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(enrolment =>
                new
                {
                    enrolment.ProviderName,
                    enrolment.ExternalReference
                })
            .IsUnique()
            .HasDatabaseName(
                "ux_biometric_enrolments_provider_reference");

        builder.HasIndex(enrolment =>
                new
                {
                    enrolment.BiometricProfileId,
                    enrolment.Modality,
                    enrolment.Status
                })
            .HasDatabaseName(
                "ix_biometric_enrolments_profile_modality_status");

        builder.HasOne(enrolment =>
                enrolment.BiometricProfile)
            .WithMany(profile =>
                profile.Enrolments)
            .HasForeignKey(enrolment =>
                enrolment.BiometricProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}