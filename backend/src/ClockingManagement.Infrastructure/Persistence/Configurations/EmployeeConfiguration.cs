using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class EmployeeConfiguration
    : IEntityTypeConfiguration<Employee>
{
    public void Configure(
        EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("employees");

        builder.HasKey(employee => employee.Id);

        builder.Property(employee => employee.Id)
            .HasColumnName("id");

        builder.Property(employee => employee.EmployeeNumber)
            .HasColumnName("employee_number")
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(employee => employee.FirstName)
            .HasColumnName("first_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(employee => employee.LastName)
            .HasColumnName("last_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(employee => employee.Email)
            .HasColumnName("email")
            .HasMaxLength(255);

        builder.Property(employee => employee.PhoneNumber)
            .HasColumnName("phone_number")
            .HasMaxLength(30);

        builder.Property(employee => employee.DepartmentId)
            .HasColumnName("department_id")
            .IsRequired();

        builder.Property(employee => employee.WorkLocationId)
            .HasColumnName("work_location_id")
            .IsRequired();

        builder.Property(employee => employee.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(employee => employee.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(employee => employee.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(employee => employee.EmployeeNumber)
            .IsUnique()
            .HasDatabaseName("ux_employees_employee_number");

        builder.HasIndex(employee => employee.Email)
            .IsUnique()
            .HasDatabaseName("ux_employees_email");

        builder.HasIndex(employee => employee.DepartmentId)
            .HasDatabaseName("ix_employees_department_id");

        builder.HasIndex(employee => employee.WorkLocationId)
            .HasDatabaseName("ix_employees_work_location_id");

        builder.HasOne(employee => employee.Department)
            .WithMany(department => department.Employees)
            .HasForeignKey(employee => employee.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(employee => employee.WorkLocation)
            .WithMany(location => location.Employees)
            .HasForeignKey(employee => employee.WorkLocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}