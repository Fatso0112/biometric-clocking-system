using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.WorkLocations;

public sealed record CreateWorkLocationRequest(
    [Required]
    [StringLength(150, MinimumLength = 2)]
    string Name,

    [Required]
    [StringLength(300, MinimumLength = 3)]
    string Address,

    [Range(-90, 90)]
    decimal? Latitude,

    [Range(-180, 180)]
    decimal? Longitude,

    [Range(1, 10_000)]
    int AllowedRadiusMetres = 100);

public sealed record WorkLocationResponse(
    Guid Id,
    string Name,
    string Address,
    decimal? Latitude,
    decimal? Longitude,
    int AllowedRadiusMetres,
    bool IsActive,
    DateTimeOffset CreatedAtUtc);