using BiometricClocking.Realtime.Data;
using BiometricClocking.Realtime.Models;
using System.Text.Json;

namespace BiometricClocking.Realtime.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(string action, string entityType, string entityId, object data, HttpContext httpContext)
    {
        var log = new AuditLog
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            NewValuesJson = JsonSerializer.Serialize(data),
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString()
        };
        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }
}