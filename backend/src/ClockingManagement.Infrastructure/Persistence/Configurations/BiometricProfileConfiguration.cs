using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class BiometricProfileConfiguration
    : IEntityTypeConfiguration<BiometricProfile>
{
    public void Configure(
        EntityTypeBuilder<BiometricProfile> builder)
    {
        builder.ToTable("biometric_profiles");

        builder.HasKey(profile =>
            profile.Id);

        builder.Property(profile =>
                profile.Id)
            .HasColumnName("id");

        builder.Property(profile =>
                profile.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(profile =>
                profile.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(profile =>
                profile.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(profile =>
                profile.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(profile =>
                profile.EmployeeId)
            .IsUnique()
            .HasDatabaseName(
                "ux_biometric_profiles_employee_id");

        builder.HasOne(profile =>
                profile.Employee)
            .WithOne(employee =>
                employee.BiometricProfile)
            .HasForeignKey<BiometricProfile>(
                profile =>
                    profile.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}