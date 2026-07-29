using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class WorkLocationConfiguration
    : IEntityTypeConfiguration<WorkLocation>
{
    public void Configure(
        EntityTypeBuilder<WorkLocation> builder)
    {
        builder.ToTable("work_locations");

        builder.HasKey(location => location.Id);

        builder.Property(location => location.Id)
            .HasColumnName("id");

        builder.Property(location => location.Name)
            .HasColumnName("name")
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(location => location.Address)
            .HasColumnName("address")
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(location => location.Latitude)
            .HasColumnName("latitude")
            .HasPrecision(9, 6);

        builder.Property(location => location.Longitude)
            .HasColumnName("longitude")
            .HasPrecision(9, 6);

        builder.Property(location => location.AllowedRadiusMetres)
            .HasColumnName("allowed_radius_metres")
            .IsRequired();

        builder.Property(location => location.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(location => location.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(location => location.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(location => location.Name)
            .IsUnique()
            .HasDatabaseName("ux_work_locations_name");

        builder.Property(location => location.RequireIpMatch)
            .HasColumnName("require_ip_match")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(location => location.RequireGeofence)
            .HasColumnName("require_geofence")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(
                location =>
                    location.MaximumLocationAccuracyMetres)
            .HasColumnName(
                "maximum_location_accuracy_metres")
            .HasDefaultValue(100)
            .IsRequired();

        builder.Property(location => location.TimeZoneId)
            .HasColumnName("time_zone_id")
            .HasMaxLength(100)
            .HasDefaultValue("Africa/Johannesburg")
            .IsRequired();

        builder.ToTable(
            table =>
            {
                table.HasCheckConstraint(
                    "ck_work_locations_radius_positive",
                    "allowed_radius_metres > 0");

                table.HasCheckConstraint(
                    "ck_work_locations_latitude",
                    "latitude IS NULL OR " +
                    "(latitude >= -90 AND latitude <= 90)");

                table.HasCheckConstraint(
                    "ck_work_locations_longitude",
                    "longitude IS NULL OR " +
                    "(longitude >= -180 AND longitude <= 180)");

                table.HasCheckConstraint(
                    "ck_work_locations_accuracy_positive",
                    "maximum_location_accuracy_metres > 0");
            });
    }
}