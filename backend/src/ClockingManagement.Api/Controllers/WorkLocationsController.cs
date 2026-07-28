using ClockingManagement.Application.WorkLocations;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/work-locations")]
public sealed class WorkLocationsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public WorkLocationsController(
        ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<WorkLocationResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        IReadOnlyCollection<WorkLocationResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var locations = await _dbContext.WorkLocations
            .AsNoTracking()
            .OrderBy(location => location.Name)
            .Select(location => new WorkLocationResponse(
                location.Id,
                location.Name,
                location.Address,
                location.Latitude,
                location.Longitude,
                location.AllowedRadiusMetres,
                location.IsActive,
                location.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(locations);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(WorkLocationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkLocationResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var location = await _dbContext.WorkLocations
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new WorkLocationResponse(
                item.Id,
                item.Name,
                item.Address,
                item.Latitude,
                item.Longitude,
                item.AllowedRadiusMetres,
                item.IsActive,
                item.CreatedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);

        if (location is null)
        {
            return NotFound(new
            {
                message = "Work location was not found."
            });
        }

        return Ok(location);
    }

    [HttpPost]
    [ProducesResponseType(
        typeof(WorkLocationResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<WorkLocationResponse>> Create(
        [FromBody] CreateWorkLocationRequest request,
        CancellationToken cancellationToken)
    {
        var locationName = request.Name.Trim();

        var locationExists =
            await _dbContext.WorkLocations.AnyAsync(
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

        var location = new WorkLocation
        {
            Name = locationName,
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            AllowedRadiusMetres =
                request.AllowedRadiusMetres
        };

        _dbContext.WorkLocations.Add(location);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response = new WorkLocationResponse(
            location.Id,
            location.Name,
            location.Address,
            location.Latitude,
            location.Longitude,
            location.AllowedRadiusMetres,
            location.IsActive,
            location.CreatedAtUtc);

        return CreatedAtAction(
            nameof(GetById),
            new { id = location.Id },
            response);
    }
}