using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace ClockingManagement.Infrastructure.Persistence;

public sealed class ApplicationDbContextFactory
    : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable(
                "CLOCKING_DATABASE_CONNECTION");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            // Used only to allow EF Core to build the model
            // when creating migrations.
            connectionString =
                "Host=localhost;Port=5432;Database=clocking_management;Username=postgres;Password=postgres";
        }

        var optionsBuilder =
            new DbContextOptionsBuilder<ApplicationDbContext>();

        optionsBuilder.UseNpgsql(connectionString);

        return new ApplicationDbContext(
            optionsBuilder.Options);
    }
}