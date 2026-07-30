using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ClockingManagement.Application.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ClockingManagement.Api.Authentication;

public sealed class JwtAuthenticationTokenService
    : IAuthenticationTokenService
{
    private readonly JwtOptions _jwtOptions;

    private readonly SigningCredentials
        _signingCredentials;

    public JwtAuthenticationTokenService(
        IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions =
            jwtOptions.Value;

        var signingKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _jwtOptions.SigningKey));

        _signingCredentials =
            new SigningCredentials(
                signingKey,
                SecurityAlgorithms.HmacSha256);
    }

    public IssuedTokenPair IssueTokenPair(
        TokenUserData user,
        DateTimeOffset issuedAtUtc)
    {
        var accessTokenExpiresAtUtc =
            issuedAtUtc.AddMinutes(
                _jwtOptions.AccessTokenMinutes);

        var refreshTokenExpiresAtUtc =
            issuedAtUtc.AddDays(
                _jwtOptions.RefreshTokenDays);

        var claims =
            CreateClaims(user);

        var jwt =
            new JwtSecurityToken(
                issuer:
                    _jwtOptions.Issuer,
                audience:
                    _jwtOptions.Audience,
                claims:
                    claims,
                notBefore:
                    issuedAtUtc.UtcDateTime,
                expires:
                    accessTokenExpiresAtUtc
                        .UtcDateTime,
                signingCredentials:
                    _signingCredentials);

        var accessToken =
            new JwtSecurityTokenHandler()
                .WriteToken(jwt);

        var refreshToken =
            GenerateRefreshToken();

        var refreshTokenHash =
            HashRefreshToken(
                refreshToken);

        return new IssuedTokenPair(
            AccessToken:
                accessToken,
            AccessTokenExpiresAtUtc:
                accessTokenExpiresAtUtc,
            RefreshToken:
                refreshToken,
            RefreshTokenHash:
                refreshTokenHash,
            RefreshTokenExpiresAtUtc:
                refreshTokenExpiresAtUtc);
    }

    public string HashRefreshToken(
        string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(
                refreshToken))
        {
            throw new ArgumentException(
                "A refresh token is required.",
                nameof(refreshToken));
        }

        var tokenBytes =
            Encoding.UTF8.GetBytes(
                refreshToken.Trim());

        var hashBytes =
            SHA256.HashData(
                tokenBytes);

        return Convert.ToHexString(
            hashBytes);
    }

    private static IReadOnlyCollection<Claim>
        CreateClaims(
            TokenUserData user)
    {
        var claims =
            new List<Claim>
            {
                new(
                    JwtRegisteredClaimNames.Sub,
                    user.UserId.ToString()),

                new(
                    ClaimTypes.NameIdentifier,
                    user.UserId.ToString()),

                new(
                    JwtRegisteredClaimNames.Jti,
                    Guid.NewGuid().ToString()),

                new(
                    ClaimTypes.GivenName,
                    user.FirstName),

                new(
                    ClaimTypes.Surname,
                    user.LastName)
            };

        if (!string.IsNullOrWhiteSpace(
                user.Email))
        {
            claims.Add(
                new Claim(
                    JwtRegisteredClaimNames.Email,
                    user.Email));

            claims.Add(
                new Claim(
                    ClaimTypes.Email,
                    user.Email));
        }

        if (user.EmployeeId.HasValue)
        {
            claims.Add(
                new Claim(
                    "employee_id",
                    user.EmployeeId.Value
                        .ToString()));
        }

        foreach (var role in user.Roles)
        {
            claims.Add(
                new Claim(
                    ClaimTypes.Role,
                    role));
        }

        return claims;
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes =
            new byte[64];

        RandomNumberGenerator.Fill(
            randomBytes);

        return Convert.ToHexString(
            randomBytes);
    }
}