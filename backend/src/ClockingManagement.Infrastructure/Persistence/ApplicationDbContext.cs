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

    public DbSet<WorkLocation> WorkLocations =>
        Set<WorkLocation>();

    public DbSet<Employee> Employees =>
        Set<Employee>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }
}