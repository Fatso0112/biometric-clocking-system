using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class DepartmentPayrollPolicyConfiguration
    : IEntityTypeConfiguration<DepartmentPayrollPolicy>
{
    public void Configure(
        EntityTypeBuilder<DepartmentPayrollPolicy> builder)
    {
        builder.ToTable("department_payroll_policies");

        builder.HasKey(policy => policy.Id);

        builder.Property(policy => policy.Id)
            .HasColumnName("id");

        builder.Property(policy => policy.DepartmentId)
            .HasColumnName("department_id")
            .IsRequired();

        builder.Property(policy => policy.BaseSalary)
            .HasColumnName("base_salary")
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(policy => policy.ExpectedMonthlyHours)
            .HasColumnName("expected_monthly_hours")
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(policy => policy.OvertimeMultiplier)
            .HasColumnName("overtime_multiplier")
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(policy => policy.DeductMissingHours)
            .HasColumnName("deduct_missing_hours")
            .IsRequired();

        builder.Property(policy => policy.PayOvertime)
            .HasColumnName("pay_overtime")
            .IsRequired();

        builder.Property(policy => policy.StandardBreakMinutesPerDay)
            .HasColumnName("standard_break_minutes_per_day")
            .IsRequired();

        builder.Property(policy => policy.EffectiveFrom)
            .HasColumnName("effective_from")
            .IsRequired();

        builder.Property(policy => policy.EffectiveTo)
            .HasColumnName("effective_to");

        builder.Property(policy => policy.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(policy => policy.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(policy => policy.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.Property(policy => policy.Notes)
            .HasColumnName("notes")
            .HasMaxLength(1000);

        builder.HasOne(policy => policy.Department)
            .WithMany(department => department.PayrollPolicies)
            .HasForeignKey(policy => policy.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(policy => new
        {
            policy.DepartmentId,
            policy.EffectiveFrom
        })
        .HasDatabaseName("ix_department_payroll_policies_department_effective_from");
    }
}