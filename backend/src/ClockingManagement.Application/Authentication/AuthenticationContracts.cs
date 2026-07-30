using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Authentication;

public sealed record LoginRequest(
    [Required]
    [EmailAddress]
    [StringLength(256)]
    string Email,

    [Required]
    [StringLength(200, MinimumLength = 8)]
    string Password);

public sealed record RefreshAccessTokenRequest(
    [Required]
    [StringLength(300, MinimumLength = 64)]
    string RefreshToken);

public sealed record LogoutRequest(
    [Required]
    [StringLength(300, MinimumLength = 64)]
    string RefreshToken);

public sealed record AuthenticatedUserResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    Guid? EmployeeId,
    bool IsActive,
    IReadOnlyCollection<string> Roles);

public sealed record AuthenticationResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAtUtc,
    AuthenticatedUserResponse User);

public sealed record TokenUserData(
    Guid UserId,
    string? Email,
    string FirstName,
    string LastName,
    Guid? EmployeeId,
    IReadOnlyCollection<string> Roles);

public sealed record IssuedTokenPair(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    string RefreshToken,
    string RefreshTokenHash,
    DateTimeOffset RefreshTokenExpiresAtUtc);

public interface IAuthenticationTokenService
{
    IssuedTokenPair IssueTokenPair(
        TokenUserData user,
        DateTimeOffset issuedAtUtc);

    string HashRefreshToken(
        string refreshToken);
}