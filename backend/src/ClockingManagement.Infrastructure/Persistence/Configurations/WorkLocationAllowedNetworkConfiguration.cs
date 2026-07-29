using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class WorkLocationAllowedNetworkConfiguration
    : IEntityTypeConfiguration<WorkLocationAllowedNetwork>
{
    public void Configure(
        EntityTypeBuilder<WorkLocationAllowedNetwork> builder)
    {
        builder.ToTable(
            "work_location_allowed_networks");

        builder.HasKey(network => network.Id);

        builder.Property(network => network.Id)
            .HasColumnName("id");

        builder.Property(network => network.WorkLocationId)
            .HasColumnName("work_location_id")
            .IsRequired();

        builder.Property(network => network.NetworkCidr)
            .HasColumnName("network_cidr")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(network => network.Description)
            .HasColumnName("description")
            .HasMaxLength(200);

        builder.Property(network => network.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(network => network.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(network => new
            {
                network.WorkLocationId,
                network.NetworkCidr
            })
            .IsUnique()
            .HasDatabaseName(
                "ux_work_location_networks_location_cidr");

        builder.HasOne(network => network.WorkLocation)
            .WithMany(location => location.AllowedNetworks)
            .HasForeignKey(network => network.WorkLocationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}