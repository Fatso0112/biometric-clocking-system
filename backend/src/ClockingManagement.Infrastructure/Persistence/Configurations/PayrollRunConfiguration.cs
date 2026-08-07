using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class PayrollRunConfiguration
    : IEntityTypeConfiguration<PayrollRun>
{
    public void Configure(
        EntityTypeBuilder<PayrollRun> builder)
    {
        builder.ToTable(
            "payroll_runs",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_payroll_runs_period",
                    "period_end >= period_start");

                table.HasCheckConstraint(
                    "ck_payroll_runs_approved_fields",
                    "status <> 'Approved' OR " +
                    "(approved_by_user_id IS NOT NULL AND " +
                    "approved_at_utc IS NOT NULL)");
            });

        builder.HasKey(run => run.Id);

        builder.Property(run => run.Id)
            .HasColumnName("id");

        builder.Property(run => run.PeriodStart)
            .HasColumnName("period_start")
            .HasColumnType("date")
            .IsRequired();

        builder.Property(run => run.PeriodEnd)
            .HasColumnName("period_end")
            .HasColumnType("date")
            .IsRequired();

        builder.Property(run => run.RunDateUtc)
            .HasColumnName("run_date_utc")
            .IsRequired();

        builder.Property(run => run.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(run => run.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .IsRequired();

        builder.Property(run => run.ApprovedByUserId)
            .HasColumnName("approved_by_user_id");

        builder.Property(run => run.ApprovedAtUtc)
            .HasColumnName("approved_at_utc");

        builder.Property(run => run.Notes)
            .HasColumnName("notes")
            .HasMaxLength(1000);

        builder.Property(run => run.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(run => run.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(run => new
            {
                run.PeriodStart,
                run.PeriodEnd
            })
            .HasDatabaseName(
                "ix_payroll_runs_period");

        builder.HasIndex(run => run.Status)
            .HasDatabaseName(
                "ix_payroll_runs_status");

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(run => run.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(
                "fk_payroll_runs_created_by_user");

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(run => run.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(
                "fk_payroll_runs_approved_by_user");
    }
}
