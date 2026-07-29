using System.Net;
using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Domain.Entities;

namespace ClockingManagement.Infrastructure.LocationSecurity;

public sealed class ClockingLocationValidator
    : IClockingLocationValidator
{
    private static readonly TimeSpan
        MaximumLocationAge =
            TimeSpan.FromMinutes(5);

    private static readonly TimeSpan
        MaximumFutureDifference =
            TimeSpan.FromMinutes(1);

    private readonly IIpNetworkService
        _ipNetworkService;

    public ClockingLocationValidator(
        IIpNetworkService ipNetworkService)
    {
        _ipNetworkService = ipNetworkService;
    }

    public ClockingLocationValidationResult Validate(
        WorkLocation workLocation,
        IPAddress? remoteIpAddress,
        ClockingLocationInput input)
    {
        var normalizedIpAddress =
            NormalizeAddress(remoteIpAddress);

        var ipAddressText =
            normalizedIpAddress?.ToString();

        bool? isAllowedNetwork = null;
        bool? isInsideGeofence = null;
        decimal? distanceMetres = null;

        if (!workLocation.IsActive)
        {
            return Rejected(
                "The assigned work location is inactive.",
                ipAddressText,
                isAllowedNetwork,
                distanceMetres,
                isInsideGeofence);
        }

        if (workLocation.RequireIpMatch)
        {
            if (normalizedIpAddress is null)
            {
                return Rejected(
                    "The request IP address could not be determined.",
                    ipAddressText,
                    false,
                    distanceMetres,
                    isInsideGeofence);
            }

            var allowedNetworks =
                workLocation.AllowedNetworks
                    .Where(network =>
                        network.IsActive)
                    .ToList();

            if (allowedNetworks.Count == 0)
            {
                return Rejected(
                    "No approved office network has been configured for this work location.",
                    ipAddressText,
                    false,
                    distanceMetres,
                    isInsideGeofence);
            }

            isAllowedNetwork =
                allowedNetworks.Any(network =>
                    _ipNetworkService.Contains(
                        network.NetworkCidr,
                        normalizedIpAddress));

            if (isAllowedNetwork != true)
            {
                return Rejected(
                    "Clocking is not permitted from the current network.",
                    ipAddressText,
                    false,
                    distanceMetres,
                    isInsideGeofence);
            }
        }

        if (workLocation.RequireGeofence)
        {
            if (workLocation.Latitude is null ||
                workLocation.Longitude is null)
            {
                return Rejected(
                    "The work location does not have GPS coordinates configured.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }

            if (input.AccuracyMetres <= 0)
            {
                return Rejected(
                    "The supplied GPS accuracy is invalid.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }

            if (input.AccuracyMetres >
                workLocation
                    .MaximumLocationAccuracyMetres)
            {
                return Rejected(
                    $"The GPS position is not accurate enough. Maximum permitted accuracy is {workLocation.MaximumLocationAccuracyMetres} metres.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }

            var now = DateTimeOffset.UtcNow;

            var capturedAtUtc =
                input.CapturedAtUtc.ToUniversalTime();

            if (capturedAtUtc <
                now.Subtract(MaximumLocationAge))
            {
                return Rejected(
                    "The supplied GPS position is too old.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }

            if (capturedAtUtc >
                now.Add(MaximumFutureDifference))
            {
                return Rejected(
                    "The supplied GPS capture time is invalid.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }

            distanceMetres =
                CalculateDistanceMetres(
                    workLocation.Latitude.Value,
                    workLocation.Longitude.Value,
                    input.Latitude,
                    input.Longitude);

            isInsideGeofence =
                distanceMetres <=
                workLocation.AllowedRadiusMetres;

            if (isInsideGeofence != true)
            {
                return Rejected(
                    $"Clocking is not permitted from this location. The device is approximately {distanceMetres:0} metres from the assigned office.",
                    ipAddressText,
                    isAllowedNetwork,
                    distanceMetres,
                    false);
            }
        }

        return new ClockingLocationValidationResult(
            IsAllowed: true,
            FailureMessage: null,
            IpAddress: ipAddressText,
            IsAllowedNetwork: isAllowedNetwork,
            DistanceFromWorkLocationMetres:
                distanceMetres,
            IsInsideGeofence: isInsideGeofence);
    }

    private static ClockingLocationValidationResult
        Rejected(
            string message,
            string? ipAddress,
            bool? isAllowedNetwork,
            decimal? distanceMetres,
            bool? isInsideGeofence)
    {
        return new ClockingLocationValidationResult(
            IsAllowed: false,
            FailureMessage: message,
            IpAddress: ipAddress,
            IsAllowedNetwork: isAllowedNetwork,
            DistanceFromWorkLocationMetres:
                distanceMetres,
            IsInsideGeofence: isInsideGeofence);
    }

    private static IPAddress? NormalizeAddress(
        IPAddress? address)
    {
        if (address?.IsIPv4MappedToIPv6 == true)
        {
            return address.MapToIPv4();
        }

        return address;
    }

    private static decimal CalculateDistanceMetres(
        decimal firstLatitude,
        decimal firstLongitude,
        decimal secondLatitude,
        decimal secondLongitude)
    {
        const double earthRadiusMetres =
            6_371_000;

        var latitudeOne =
            DegreesToRadians(
                (double)firstLatitude);

        var latitudeTwo =
            DegreesToRadians(
                (double)secondLatitude);

        var latitudeDifference =
            DegreesToRadians(
                (double)(
                    secondLatitude -
                    firstLatitude));

        var longitudeDifference =
            DegreesToRadians(
                (double)(
                    secondLongitude -
                    firstLongitude));

        var calculation =
            Math.Sin(latitudeDifference / 2) *
            Math.Sin(latitudeDifference / 2) +
            Math.Cos(latitudeOne) *
            Math.Cos(latitudeTwo) *
            Math.Sin(longitudeDifference / 2) *
            Math.Sin(longitudeDifference / 2);

        var centralAngle =
            2 *
            Math.Atan2(
                Math.Sqrt(calculation),
                Math.Sqrt(1 - calculation));

        var distance =
            earthRadiusMetres *
            centralAngle;

        return Math.Round(
            (decimal)distance,
            2);
    }

    private static double DegreesToRadians(
        double degrees)
    {
        return degrees *
               Math.PI /
               180.0;
    }
}