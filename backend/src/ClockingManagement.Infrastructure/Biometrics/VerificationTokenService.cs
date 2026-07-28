using System.Security.Cryptography;
using System.Text;
using ClockingManagement.Application.Biometrics;

namespace ClockingManagement.Infrastructure.Biometrics;

public sealed class VerificationTokenService
    : IVerificationTokenService
{
    public string GenerateToken()
    {
        var tokenBytes =
            RandomNumberGenerator.GetBytes(32);

        return Convert.ToHexString(tokenBytes);
    }

    public string HashToken(string token)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        var tokenBytes =
            Encoding.UTF8.GetBytes(token);

        var hashBytes =
            SHA256.HashData(tokenBytes);

        return Convert.ToHexString(hashBytes);
    }
}