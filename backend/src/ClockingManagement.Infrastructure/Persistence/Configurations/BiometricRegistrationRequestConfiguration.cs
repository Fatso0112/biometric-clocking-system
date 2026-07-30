using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class BiometricRegistrationRequestConfiguration
    : IEntityTypeConfiguration<
        BiometricRegistrationRequest>
{
    public void Configure(
        EntityTypeBuilder<
            BiometricRegistrationRequest> builder)
    {
        builder.ToTable(
            "biometric_registration_requests");

        builder.HasKey(request =>
            request.Id);

        builder.Property(request =>
                request.Id)
            .HasColumnName("id");

        builder.Property(request =>
                request.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(request =>
                request.RequestedByUserId)
            .HasColumnName(
                "requested_by_user_id")
            .IsRequired();

        builder.Property(request =>
                request.RequestedModality)
            .HasColumnName(
                "requested_modality")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(request =>
                request.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(request =>
                request.Reason)
            .HasColumnName("reason")
            .HasMaxLength(500);

        builder.Property(request =>
                request.RequestedAtUtc)
            .HasColumnName(
                "requested_at_utc")
            .IsRequired();

        builder.Property(request =>
                request.ReviewedByUserId)
            .HasColumnName(
                "reviewed_by_user_id");

        builder.Property(request =>
                request.ReviewedAtUtc)
            .HasColumnName(
                "reviewed_at_utc");

        builder.Property(request =>
                request.ReviewNotes)
            .HasColumnName(
                "review_notes")
            .HasMaxLength(1000);

        builder.Property(request =>
                request.CreatedAtUtc)
            .HasColumnName(
                "created_at_utc")
            .IsRequired();

        builder.Property(request =>
                request.UpdatedAtUtc)
            .HasColumnName(
                "updated_at_utc");

        builder.HasIndex(request =>
                new
                {
                    request.EmployeeId,
                    request.Status
                })
            .HasDatabaseName(
                "ix_biometric_registration_requests_employee_status");

        builder.HasOne(request =>
                request.Employee)
            .WithMany(employee =>
                employee
                    .BiometricRegistrationRequests)
            .HasForeignKey(request =>
                request.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}