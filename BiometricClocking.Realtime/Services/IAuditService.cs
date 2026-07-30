namespace BiometricClocking.Realtime.Services;

public interface IAuditService
{
    Task LogAsync(string action, string entityType, string entityId, object data, HttpContext httpContext);
}