using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class PayRateHistoryConfiguration
    : IEntityTypeConfiguration<PayRateHistory>
{
    public void Configure(
        EntityTypeBuilder<PayRateHistory> builder)
    {
        builder.ToTable(
            "pay_rate_history",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_pay_rate_history_hourly_rate",
                    "hourly_rate > 0");

                table.HasCheckConstraint(
                    "ck_pay_rate_history_effective_period",
                    "effective_to IS NULL OR " +
                    "effective_to >= effective_from");
            });

        builder.HasKey(rate => rate.Id);

        builder.Property(rate => rate.Id)
            .HasColumnName("id");

        builder.Property(rate => rate.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(rate => rate.HourlyRate)
            .HasColumnName("hourly_rate")
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(rate => rate.EffectiveFrom)
            .HasColumnName("effective_from")
            .HasColumnType("date")
            .IsRequired();

        builder.Property(rate => rate.EffectiveTo)
            .HasColumnName("effective_to")
            .HasColumnType("date");

        builder.Property(rate => rate.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .IsRequired();

        builder.Property(rate => rate.Notes)
            .HasColumnName("notes")
            .HasMaxLength(500);

        builder.Property(rate => rate.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(rate => new
            {
                rate.EmployeeId,
                rate.EffectiveFrom
            })
            .IsUnique()
            .HasDatabaseName(
                "ux_pay_rate_history_employee_effective_from");

        builder.HasIndex(rate => new
            {
                rate.EmployeeId,
                rate.EffectiveTo
            })
            .HasDatabaseName(
                "ix_pay_rate_history_employee_effective_to");

        builder.HasOne(rate => rate.Employee)
            .WithMany(employee => employee.PayRateHistory)
            .HasForeignKey(rate => rate.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(rate => rate.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(
                "fk_pay_rate_history_created_by_user");
    }
}
