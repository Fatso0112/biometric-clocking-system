using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Application.WorkLocations;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route(
    "api/v1/work-locations/{workLocationId:guid}/allowed-networks")]
public sealed class WorkLocationNetworksController
    : ControllerBase
{
    private readonly ApplicationDbContext
        _dbContext;

    private readonly IIpNetworkService
        _ipNetworkService;

    public WorkLocationNetworksController(
        ApplicationDbContext dbContext,
        IIpNetworkService ipNetworkService)
    {
        _dbContext = dbContext;
        _ipNetworkService = ipNetworkService;
    }

    [HttpGet]
    public async Task<ActionResult<
        IReadOnlyCollection<
            AllowedNetworkResponse>>> GetAll(
        Guid workLocationId,
        CancellationToken cancellationToken)
    {
        var workLocationExists =
            await _dbContext.WorkLocations
                .AsNoTracking()
                .AnyAsync(
                    location =>
                        location.Id ==
                        workLocationId,
                    cancellationToken);

        if (!workLocationExists)
        {
            return NotFound(new
            {
                message =
                    "Work location was not found."
            });
        }

        var networks =
            await _dbContext
                .WorkLocationAllowedNetworks
                .AsNoTracking()
                .Where(network =>
                    network.WorkLocationId ==
                    workLocationId)
                .OrderBy(network =>
                    network.NetworkCidr)
                .Select(network =>
                    new AllowedNetworkResponse(
                        network.Id,
                        network.WorkLocationId,
                        network.NetworkCidr,
                        network.Description,
                        network.IsActive,
                        network.CreatedAtUtc))
                .ToListAsync(
                    cancellationToken);

        return Ok(networks);
    }

    [HttpPost]
    public async Task<
        ActionResult<AllowedNetworkResponse>> Create(
        Guid workLocationId,
        [FromBody]
        CreateAllowedNetworkRequest request,
        CancellationToken cancellationToken)
    {
        var workLocation =
            await _dbContext.WorkLocations
                .SingleOrDefaultAsync(
                    location =>
                        location.Id ==
                        workLocationId,
                    cancellationToken);

        if (workLocation is null)
        {
            return NotFound(new
            {
                message =
                    "Work location was not found."
            });
        }

        if (!_ipNetworkService.TryNormalizeCidr(
                request.NetworkCidr,
                out var normalizedCidr))
        {
            return BadRequest(new
            {
                message =
                    "The network must be a valid IPv4 or IPv6 CIDR value."
            });
        }

        var networkExists =
            await _dbContext
                .WorkLocationAllowedNetworks
                .AnyAsync(
                    network =>
                        network.WorkLocationId ==
                            workLocationId &&
                        network.NetworkCidr ==
                            normalizedCidr,
                    cancellationToken);

        if (networkExists)
        {
            return Conflict(new
            {
                message =
                    "This network is already configured for the work location."
            });
        }

        var network =
            new WorkLocationAllowedNetwork
            {
                WorkLocationId =
                    workLocationId,
                NetworkCidr =
                    normalizedCidr,
                Description =
                    string.IsNullOrWhiteSpace(
                        request.Description)
                        ? null
                        : request.Description.Trim()
            };

        _dbContext
            .WorkLocationAllowedNetworks
            .Add(network);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response =
            new AllowedNetworkResponse(
                network.Id,
                network.WorkLocationId,
                network.NetworkCidr,
                network.Description,
                network.IsActive,
                network.CreatedAtUtc);

        return StatusCode(
            StatusCodes.Status201Created,
            response);
    }

    [HttpDelete("{networkId:guid}")]
    public async Task<IActionResult> Disable(
        Guid workLocationId,
        Guid networkId,
        CancellationToken cancellationToken)
    {
        var network =
            await _dbContext
                .WorkLocationAllowedNetworks
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == networkId &&
                        item.WorkLocationId ==
                            workLocationId,
                    cancellationToken);

        if (network is null)
        {
            return NotFound(new
            {
                message =
                    "Allowed network was not found."
            });
        }

        network.IsActive = false;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return NoContent();
    }
}