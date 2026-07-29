using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.WorkLocations;

public sealed record CreateAllowedNetworkRequest(
    [Required]
    [StringLength(50, MinimumLength = 3)]
    string NetworkCidr,

    [StringLength(200)]
    string? Description);

public sealed record AllowedNetworkResponse(
    Guid Id,
    Guid WorkLocationId,
    string NetworkCidr,
    string? Description,
    bool IsActive,
    DateTimeOffset CreatedAtUtc);