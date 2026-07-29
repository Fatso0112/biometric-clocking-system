using System.Net;
using System.Net.Sockets;
using ClockingManagement.Application.LocationSecurity;

namespace ClockingManagement.Infrastructure.LocationSecurity;

public sealed class IpNetworkService : IIpNetworkService
{
    public bool TryNormalizeCidr(
        string value,
        out string normalizedCidr)
    {
        normalizedCidr = string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var parts = value.Trim().Split(
            '/',
            StringSplitOptions.TrimEntries);

        if (parts.Length != 2)
        {
            return false;
        }

        if (!IPAddress.TryParse(
                parts[0],
                out var networkAddress))
        {
            return false;
        }

        networkAddress =
            NormalizeAddress(networkAddress);

        var networkBytes =
            networkAddress.GetAddressBytes();

        var maximumPrefixLength =
            networkBytes.Length * 8;

        if (!int.TryParse(
                parts[1],
                out var prefixLength) ||
            prefixLength < 0 ||
            prefixLength > maximumPrefixLength)
        {
            return false;
        }

        ApplyNetworkMask(
            networkBytes,
            prefixLength);

        normalizedCidr =
            $"{new IPAddress(networkBytes)}/{prefixLength}";

        return true;
    }

    public bool Contains(
        string networkCidr,
        IPAddress ipAddress)
    {
        if (!TryNormalizeCidr(
                networkCidr,
                out var normalizedCidr))
        {
            return false;
        }

        var parts = normalizedCidr.Split('/');

        var networkAddress =
            IPAddress.Parse(parts[0]);

        var prefixLength =
            int.Parse(parts[1]);

        networkAddress =
            NormalizeAddress(networkAddress);

        ipAddress =
            NormalizeAddress(ipAddress);

        if (networkAddress.AddressFamily !=
            ipAddress.AddressFamily)
        {
            return false;
        }

        var networkBytes =
            networkAddress.GetAddressBytes();

        var addressBytes =
            ipAddress.GetAddressBytes();

        var completeBytes =
            prefixLength / 8;

        var remainingBits =
            prefixLength % 8;

        for (var index = 0;
             index < completeBytes;
             index++)
        {
            if (networkBytes[index] !=
                addressBytes[index])
            {
                return false;
            }
        }

        if (remainingBits == 0)
        {
            return true;
        }

        var mask =
            (byte)(0xFF << (8 - remainingBits));

        return
            (networkBytes[completeBytes] & mask) ==
            (addressBytes[completeBytes] & mask);
    }

    private static IPAddress NormalizeAddress(
        IPAddress address)
    {
        if (address.AddressFamily ==
                AddressFamily.InterNetworkV6 &&
            address.IsIPv4MappedToIPv6)
        {
            return address.MapToIPv4();
        }

        return address;
    }

    private static void ApplyNetworkMask(
        byte[] addressBytes,
        int prefixLength)
    {
        var completeBytes =
            prefixLength / 8;

        var remainingBits =
            prefixLength % 8;

        if (remainingBits > 0 &&
            completeBytes < addressBytes.Length)
        {
            var mask =
                (byte)(0xFF << (8 - remainingBits));

            addressBytes[completeBytes] &= mask;

            completeBytes++;
        }

        for (var index = completeBytes;
             index < addressBytes.Length;
             index++)
        {
            addressBytes[index] = 0;
        }
    }
}