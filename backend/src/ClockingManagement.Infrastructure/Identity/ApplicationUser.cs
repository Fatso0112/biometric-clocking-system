using ClockingManagement.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace ClockingManagement.Infrastructure.Identity;

public sealed class ApplicationUser
    : IdentityUser<Guid>
{
    public string FirstName { get; set; } =
        string.Empty;

    public string LastName { get; set; } =
        string.Empty;

    public Guid? EmployeeId { get; set; }

    public Employee? Employee { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public ICollection<RefreshToken> RefreshTokens
        { get; set; } =
            new List<RefreshToken>();
}