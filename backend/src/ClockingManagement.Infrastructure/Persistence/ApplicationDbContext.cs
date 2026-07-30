using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Infrastructure.Persistence;

public sealed class ApplicationDbContext
    : IdentityDbContext<
        ApplicationUser,
        IdentityRole<Guid>,
        Guid>
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

    public DbSet<AttendanceEvent> AttendanceEvents =>
        Set<AttendanceEvent>();

    public DbSet<BiometricVerificationSession>
        BiometricVerificationSessions =>
            Set<BiometricVerificationSession>();

    public DbSet<WorkLocationAllowedNetwork>
        WorkLocationAllowedNetworks =>
            Set<WorkLocationAllowedNetwork>();

    public DbSet<RefreshToken> RefreshTokens =>
        Set<RefreshToken>();

    public DbSet<BiometricProfile>
        BiometricProfiles =>
            Set<BiometricProfile>();

    public DbSet<BiometricEnrolment>
        BiometricEnrolments =>
            Set<BiometricEnrolment>();

    public DbSet<BiometricRegistrationRequest>
        BiometricRegistrationRequests =>
            Set<BiometricRegistrationRequest>();

    public DbSet<BiometricRecognitionAttempt>
        BiometricRecognitionAttempts =>
            Set<BiometricRecognitionAttempt>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }
}