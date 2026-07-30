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
    int AllowedRadiusMetres = 100,

    [Range(1, 10_000)]
    int MaximumLocationAccuracyMetres = 100,

    bool RequireIpMatch = true,

    bool RequireGeofence = true,

    [Required]
    [StringLength(100, MinimumLength = 3)]
    string TimeZoneId = "Africa/Johannesburg");

public sealed record UpdateWorkLocationRequest(
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

    [Required]
    [Range(1, 10_000)]
    int? AllowedRadiusMetres,

    [Required]
    [Range(1, 10_000)]
    int? MaximumLocationAccuracyMetres,

    [Required]
    bool? RequireIpMatch,

    [Required]
    bool? RequireGeofence,

    [Required]
    [StringLength(100, MinimumLength = 3)]
    string TimeZoneId,

    [Required]
    bool? IsActive);

public sealed record WorkLocationResponse(
    Guid Id,
    string Name,
    string Address,
    decimal? Latitude,
    decimal? Longitude,
    int AllowedRadiusMetres,
    int MaximumLocationAccuracyMetres,
    bool RequireIpMatch,
    bool RequireGeofence,
    string TimeZoneId,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);