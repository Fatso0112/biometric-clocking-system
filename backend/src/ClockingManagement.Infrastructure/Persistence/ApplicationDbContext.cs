using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Department> Departments =>
        Set<Department>();
    
    public DbSet<DepartmentPayrollPolicy> DepartmentPayrollPolicies =>
    Set<DepartmentPayrollPolicy>();

    public DbSet<WorkLocation> WorkLocations =>
        Set<WorkLocation>();

    public DbSet<Employee> Employees =>
        Set<Employee>();

    public DbSet<AttendanceEvent> AttendanceEvents =>
        Set<AttendanceEvent>();

    public DbSet<BiometricVerificationSession>
        BiometricVerificationSessions =>
            Set<BiometricVerificationSession>();

    public DbSet<WorkLocationAllowedNetwork>
        WorkLocationAllowedNetworks =>
            Set<WorkLocationAllowedNetwork>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }


    
}