using ClockingManagement.Application.Authorization;
using Microsoft.AspNetCore.Authorization;
using ClockingManagement.Application.WorkLocations;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/work-locations")]
[Authorize]
public sealed class WorkLocationsController
    : ControllerBase
{
    private readonly ApplicationDbContext
        _dbContext;

    private readonly IWorkdayTimeService
        _workdayTimeService;

    public WorkLocationsController(
        ApplicationDbContext dbContext,
        IWorkdayTimeService workdayTimeService)
    {
        _dbContext = dbContext;
        _workdayTimeService =
            workdayTimeService;
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ViewWorkLocations)]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<
            WorkLocationResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        IReadOnlyCollection<WorkLocationResponse>>>
        GetAll(
            CancellationToken cancellationToken)
    {
        var locations =
            await _dbContext.WorkLocations
                .AsNoTracking()
                .OrderBy(location =>
                    location.Name)
                .Select(location =>
                    new WorkLocationResponse(
                        location.Id,
                        location.Name,
                        location.Address,
                        location.Latitude,
                        location.Longitude,
                        location
                            .AllowedRadiusMetres,
                        location
                            .MaximumLocationAccuracyMetres,
                        location.RequireIpMatch,
                        location.RequireGeofence,
                        location.TimeZoneId,
                        location.IsActive,
                        location.CreatedAtUtc,
                        location.UpdatedAtUtc))
                .ToListAsync(
                    cancellationToken);

        return Ok(locations);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ViewWorkLocations)]
    [ProducesResponseType(
        typeof(WorkLocationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<
        WorkLocationResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var location =
            await _dbContext.WorkLocations
                .AsNoTracking()
                .Where(item =>
                    item.Id == id)
                .Select(item =>
                    new WorkLocationResponse(
                        item.Id,
                        item.Name,
                        item.Address,
                        item.Latitude,
                        item.Longitude,
                        item.AllowedRadiusMetres,
                        item
                            .MaximumLocationAccuracyMetres,
                        item.RequireIpMatch,
                        item.RequireGeofence,
                        item.TimeZoneId,
                        item.IsActive,
                        item.CreatedAtUtc,
                        item.UpdatedAtUtc))
                .SingleOrDefaultAsync(
                    cancellationToken);

        if (location is null)
        {
            return NotFound(new
            {
                message =
                    "Work location was not found."
            });
        }

        return Ok(location);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManageWorkLocations)]
    [ProducesResponseType(
        typeof(WorkLocationResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<
        WorkLocationResponse>> Create(
        [FromBody]
        CreateWorkLocationRequest request,
        CancellationToken cancellationToken)
    {
        var locationName =
            request.Name.Trim();

        var coordinateError =
            ValidateCoordinates(
                request.Latitude,
                request.Longitude,
                request.RequireGeofence);

        if (coordinateError is not null)
        {
            return BadRequest(new
            {
                message = coordinateError
            });
        }

        if (!_workdayTimeService
                .TryNormalizeTimeZoneId(
                    request.TimeZoneId,
                    out var normalizedTimeZoneId))
        {
            return BadRequest(new
            {
                message =
                    "The supplied timezone is not valid."
            });
        }

        var locationExists =
            await _dbContext.WorkLocations
                .AnyAsync(
                    location =>
                        EF.Functions.ILike(
                            location.Name,
                            locationName),
                    cancellationToken);

        if (locationExists)
        {
            return Conflict(new
            {
                message =
                    "A work location with this name already exists."
            });
        }

        var location =
            new WorkLocation
            {
                Name = locationName,
                Address =
                    request.Address.Trim(),
                Latitude =
                    request.Latitude,
                Longitude =
                    request.Longitude,
                AllowedRadiusMetres =
                    request.AllowedRadiusMetres,
                MaximumLocationAccuracyMetres =
                    request
                        .MaximumLocationAccuracyMetres,
                RequireIpMatch =
                    request.RequireIpMatch,
                RequireGeofence =
                    request.RequireGeofence,
                TimeZoneId =
                    normalizedTimeZoneId
            };

        _dbContext.WorkLocations.Add(
            location);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response =
            ToResponse(location);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = location.Id
            },
            response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManageWorkLocations)]
    [ProducesResponseType(
        typeof(WorkLocationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<
        WorkLocationResponse>> Update(
        Guid id,
        [FromBody]
        UpdateWorkLocationRequest request,
        CancellationToken cancellationToken)
    {
        var location =
            await _dbContext.WorkLocations
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == id,
                    cancellationToken);

        if (location is null)
        {
            return NotFound(new
            {
                message =
                    "Work location was not found."
            });
        }

        var locationName =
            request.Name.Trim();

        var coordinateError =
            ValidateCoordinates(
                request.Latitude,
                request.Longitude,
                request.RequireGeofence!.Value);

        if (coordinateError is not null)
        {
            return BadRequest(new
            {
                message = coordinateError
            });
        }

        if (!_workdayTimeService
                .TryNormalizeTimeZoneId(
                    request.TimeZoneId,
                    out var normalizedTimeZoneId))
        {
            return BadRequest(new
            {
                message =
                    "The supplied timezone is not valid."
            });
        }

        var duplicateName =
            await _dbContext.WorkLocations
                .AnyAsync(
                    item =>
                        item.Id != id &&
                        EF.Functions.ILike(
                            item.Name,
                            locationName),
                    cancellationToken);

        if (duplicateName)
        {
            return Conflict(new
            {
                message =
                    "Another work location already uses this name."
            });
        }

        location.Name =
            locationName;

        location.Address =
            request.Address.Trim();

        location.Latitude =
            request.Latitude;

        location.Longitude =
            request.Longitude;

        location.AllowedRadiusMetres =
            request.AllowedRadiusMetres!.Value;

        location.MaximumLocationAccuracyMetres =
            request
                .MaximumLocationAccuracyMetres!
                .Value;

        location.RequireIpMatch =
            request.RequireIpMatch!.Value;

        location.RequireGeofence =
            request.RequireGeofence!.Value;

        location.TimeZoneId =
            normalizedTimeZoneId;

        location.IsActive =
            request.IsActive!.Value;

        location.UpdatedAtUtc =
            DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ToResponse(location));
    }

    private static string? ValidateCoordinates(
        decimal? latitude,
        decimal? longitude,
        bool requireGeofence)
    {
        if (latitude.HasValue !=
            longitude.HasValue)
        {
            return
                "Latitude and longitude must be supplied together.";
        }

        if (requireGeofence &&
            (!latitude.HasValue ||
             !longitude.HasValue))
        {
            return
                "Latitude and longitude are required when geofencing is enabled.";
        }

        return null;
    }

    private static WorkLocationResponse
        ToResponse(
            WorkLocation location)
    {
        return new WorkLocationResponse(
            location.Id,
            location.Name,
            location.Address,
            location.Latitude,
            location.Longitude,
            location.AllowedRadiusMetres,
            location
                .MaximumLocationAccuracyMetres,
            location.RequireIpMatch,
            location.RequireGeofence,
            location.TimeZoneId,
            location.IsActive,
            location.CreatedAtUtc,
            location.UpdatedAtUtc);
    }
}