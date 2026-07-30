using BiometricClocking.Realtime.Models;
using Microsoft.EntityFrameworkCore;

namespace BiometricClocking.Realtime.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AuditLog> AuditLogs { get; set; }
}