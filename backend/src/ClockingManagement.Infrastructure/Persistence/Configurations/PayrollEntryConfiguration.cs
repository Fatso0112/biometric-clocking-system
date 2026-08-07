using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class PayrollEntryConfiguration
    : IEntityTypeConfiguration<PayrollEntry>
{
    public void Configure(
        EntityTypeBuilder<PayrollEntry> builder)
    {
        builder.ToTable(
            "payroll_entries",
            table =>
            {
                table.HasCheckConstraint(
                    "ck_payroll_entries_worked_minutes",
                    "worked_minutes >= 0");

                table.HasCheckConstraint(
                    "ck_payroll_entries_break_minutes",
                    "break_minutes >= 0");

                table.HasCheckConstraint(
                    "ck_payroll_entries_hours_worked",
                    "hours_worked >= 0");

                table.HasCheckConstraint(
                    "ck_payroll_entries_rate_applied",
                    "rate_applied IS NULL OR rate_applied > 0");

                table.HasCheckConstraint(
                    "ck_payroll_entries_gross_pay",
                    "gross_pay IS NULL OR gross_pay >= 0");

                table.HasCheckConstraint(
                    "ck_payroll_entries_ready_values",
                    "has_exceptions OR " +
                    "(rate_applied IS NOT NULL AND " +
                    "gross_pay IS NOT NULL)");
            });

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.Id)
            .HasColumnName("id");

        builder.Property(entry => entry.PayrollRunId)
            .HasColumnName("payroll_run_id")
            .IsRequired();

        builder.Property(entry => entry.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(entry => entry.WorkedMinutes)
            .HasColumnName("worked_minutes")
            .IsRequired();

        builder.Property(entry => entry.BreakMinutes)
            .HasColumnName("break_minutes")
            .IsRequired();

        builder.Property(entry => entry.HoursWorked)
            .HasColumnName("hours_worked")
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(entry => entry.RateApplied)
            .HasColumnName("rate_applied")
            .HasPrecision(18, 2);

        builder.Property(entry => entry.GrossPay)
            .HasColumnName("gross_pay")
            .HasPrecision(18, 2);

        builder.Property(entry => entry.HasExceptions)
            .HasColumnName("has_exceptions")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(entry => entry.Notes)
            .HasColumnName("notes")
            .HasMaxLength(1000);

        builder.Property(entry => entry.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(entry => new
            {
                entry.PayrollRunId,
                entry.EmployeeId
            })
            .IsUnique()
            .HasDatabaseName(
                "ux_payroll_entries_run_employee");

        builder.HasIndex(entry => entry.EmployeeId)
            .HasDatabaseName(
                "ix_payroll_entries_employee_id");

        builder.HasOne(entry => entry.PayrollRun)
            .WithMany(run => run.Entries)
            .HasForeignKey(entry => entry.PayrollRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(entry => entry.Employee)
            .WithMany(employee => employee.PayrollEntries)
            .HasForeignKey(entry => entry.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
