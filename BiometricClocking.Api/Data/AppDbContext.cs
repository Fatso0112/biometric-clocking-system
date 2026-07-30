using Microsoft.EntityFrameworkCore;
using BiometricClocking.Api.Models;

namespace BiometricClocking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options
    ) : base(options)
    {

    }


    public DbSet<Employee> Employees { get; set; }

    public DbSet<Attendance> Attendances { get; set; }

    public DbSet<AuditLog> AuditLogs { get; set; }
}