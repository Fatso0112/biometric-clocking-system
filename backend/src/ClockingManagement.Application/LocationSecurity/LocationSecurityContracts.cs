using System.Net;
using ClockingManagement.Domain.Entities;

namespace ClockingManagement.Application.LocationSecurity;

public sealed record ClockingLocationInput(
    decimal Latitude,
    decimal Longitude,
    decimal AccuracyMetres,
    DateTimeOffset CapturedAtUtc);

public sealed record ClockingLocationValidationResult(
    bool IsAllowed,
    string? FailureMessage,
    string? IpAddress,
    bool? IsAllowedNetwork,
    decimal? DistanceFromWorkLocationMetres,
    bool? IsInsideGeofence);

public interface IIpNetworkService
{
    bool TryNormalizeCidr(
        string value,
        out string normalizedCidr);

    bool Contains(
        string networkCidr,
        IPAddress ipAddress);
}

public interface IClockingLocationValidator
{
    ClockingLocationValidationResult Validate(
        WorkLocation workLocation,
        IPAddress? remoteIpAddress,
        ClockingLocationInput input);
}