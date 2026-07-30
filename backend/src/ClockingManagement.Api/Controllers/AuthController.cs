using ClockingManagement.Application.Authentication;
using ClockingManagement.Infrastructure.Identity;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController
    : ControllerBase
{
    private readonly UserManager<ApplicationUser>
        _userManager;

    private readonly SignInManager<ApplicationUser>
        _signInManager;

    private readonly ApplicationDbContext
        _dbContext;

    private readonly IAuthenticationTokenService
        _tokenService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ApplicationDbContext dbContext,
        IAuthenticationTokenService tokenService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _dbContext = dbContext;
        _tokenService = tokenService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(
        typeof(AuthenticationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<
        AuthenticationResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedEmail =
            request.Email.Trim();

        var user =
            await _userManager.FindByEmailAsync(
                normalizedEmail);

        if (user is null)
        {
            return Unauthorized(new
            {
                errorCode =
                    "INVALID_CREDENTIALS",

                message =
                    "The email address or password is incorrect."
            });
        }

        if (!user.IsActive)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "ACCOUNT_DISABLED",

                    message =
                        "This account has been disabled."
                });
        }

        var signInResult =
            await _signInManager
                .CheckPasswordSignInAsync(
                    user,
                    request.Password,
                    lockoutOnFailure: true);

        if (signInResult.IsLockedOut)
        {
            return StatusCode(
                423,
                new
                {
                    errorCode =
                        "ACCOUNT_LOCKED",

                    message =
                        "The account is temporarily locked because of repeated failed login attempts.",

                    lockoutEndUtc =
                        user.LockoutEnd
                });
        }

        if (signInResult.IsNotAllowed)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "LOGIN_NOT_ALLOWED",

                    message =
                        "Login is not permitted for this account."
                });
        }

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new
            {
                errorCode =
                    "INVALID_CREDENTIALS",

                message =
                    "The email address or password is incorrect."
            });
        }

        var roles =
            (await _userManager.GetRolesAsync(
                user))
                .ToArray();

        var now =
            DateTimeOffset.UtcNow;

        var tokenPair =
            _tokenService.IssueTokenPair(
                CreateTokenUserData(
                    user,
                    roles),
                now);

        var refreshToken =
            CreateRefreshTokenEntity(
                user.Id,
                tokenPair,
                now);

        _dbContext.RefreshTokens.Add(
            refreshToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            CreateAuthenticationResponse(
                user,
                roles,
                tokenPair));
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(
        typeof(AuthenticationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<
        AuthenticationResponse>> Refresh(
        [FromBody]
        RefreshAccessTokenRequest request,
        CancellationToken cancellationToken)
    {
        var suppliedRefreshToken =
            request.RefreshToken.Trim();

        var suppliedTokenHash =
            _tokenService.HashRefreshToken(
                suppliedRefreshToken);

        var storedToken =
            await _dbContext.RefreshTokens
                .Include(token =>
                    token.User)
                .SingleOrDefaultAsync(
                    token =>
                        token.TokenHash ==
                            suppliedTokenHash,
                    cancellationToken);

        if (storedToken is null)
        {
            return Unauthorized(new
            {
                errorCode =
                    "INVALID_REFRESH_TOKEN",

                message =
                    "The refresh token is invalid."
            });
        }

        if (storedToken.RevokedAtUtc
            is not null)
        {
            return Unauthorized(new
            {
                errorCode =
                    "REFRESH_TOKEN_REVOKED",

                message =
                    "The refresh token has been revoked."
            });
        }

        var now =
            DateTimeOffset.UtcNow;

        if (storedToken.ExpiresAtUtc <= now)
        {
            return Unauthorized(new
            {
                errorCode =
                    "REFRESH_TOKEN_EXPIRED",

                message =
                    "The refresh token has expired."
            });
        }

        var user =
            storedToken.User;

        if (!user.IsActive)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "ACCOUNT_DISABLED",

                    message =
                        "This account has been disabled."
                });
        }

        var roles =
            (await _userManager.GetRolesAsync(
                user))
                .ToArray();

        var replacementTokenPair =
            _tokenService.IssueTokenPair(
                CreateTokenUserData(
                    user,
                    roles),
                now);

        storedToken.RevokedAtUtc =
            now;

        storedToken.RevokedByIpAddress =
            GetRequestIpAddress();

        storedToken.ReplacedByTokenHash =
            replacementTokenPair
                .RefreshTokenHash;

        var replacementRefreshToken =
            CreateRefreshTokenEntity(
                user.Id,
                replacementTokenPair,
                now);

        _dbContext.RefreshTokens.Add(
            replacementRefreshToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            CreateAuthenticationResponse(
                user,
                roles,
                replacementTokenPair));
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType(
        StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest request,
        CancellationToken cancellationToken)
    {
        var suppliedTokenHash =
            _tokenService.HashRefreshToken(
                request.RefreshToken.Trim());

        var storedToken =
            await _dbContext.RefreshTokens
                .SingleOrDefaultAsync(
                    token =>
                        token.TokenHash ==
                            suppliedTokenHash,
                    cancellationToken);

        if (storedToken is null ||
            storedToken.RevokedAtUtc is not null)
        {
            return NoContent();
        }

        storedToken.RevokedAtUtc =
            DateTimeOffset.UtcNow;

        storedToken.RevokedByIpAddress =
            GetRequestIpAddress();

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(
        typeof(AuthenticatedUserResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<
        AuthenticatedUserResponse>> GetMe()
    {
        var user =
            await _userManager.GetUserAsync(
                User);

        if (user is null ||
            !user.IsActive)
        {
            return Unauthorized(new
            {
                errorCode =
                    "AUTHENTICATED_USER_NOT_FOUND",

                message =
                    "The authenticated account could not be found."
            });
        }

        var roles =
            (await _userManager.GetRolesAsync(
                user))
                .ToArray();

        return Ok(
            CreateUserResponse(
                user,
                roles));
    }

    private RefreshToken
        CreateRefreshTokenEntity(
            Guid userId,
            IssuedTokenPair tokenPair,
            DateTimeOffset createdAtUtc)
    {
        return new RefreshToken
        {
            UserId =
                userId,

            TokenHash =
                tokenPair.RefreshTokenHash,

            CreatedAtUtc =
                createdAtUtc,

            ExpiresAtUtc =
                tokenPair
                    .RefreshTokenExpiresAtUtc,

            CreatedByIpAddress =
                GetRequestIpAddress()
        };
    }

    private static TokenUserData
        CreateTokenUserData(
            ApplicationUser user,
            IReadOnlyCollection<string> roles)
    {
        return new TokenUserData(
            UserId:
                user.Id,
            Email:
                user.Email,
            FirstName:
                user.FirstName,
            LastName:
                user.LastName,
            EmployeeId:
                user.EmployeeId,
            Roles:
                roles);
    }

    private static AuthenticationResponse
        CreateAuthenticationResponse(
            ApplicationUser user,
            IReadOnlyCollection<string> roles,
            IssuedTokenPair tokenPair)
    {
        return new AuthenticationResponse(
            AccessToken:
                tokenPair.AccessToken,
            AccessTokenExpiresAtUtc:
                tokenPair
                    .AccessTokenExpiresAtUtc,
            RefreshToken:
                tokenPair.RefreshToken,
            RefreshTokenExpiresAtUtc:
                tokenPair
                    .RefreshTokenExpiresAtUtc,
            User:
                CreateUserResponse(
                    user,
                    roles));
    }

    private static AuthenticatedUserResponse
        CreateUserResponse(
            ApplicationUser user,
            IReadOnlyCollection<string> roles)
    {
        return new AuthenticatedUserResponse(
            Id:
                user.Id,
            Email:
                user.Email ?? string.Empty,
            FirstName:
                user.FirstName,
            LastName:
                user.LastName,
            EmployeeId:
                user.EmployeeId,
            IsActive:
                user.IsActive,
            Roles:
                roles
                    .OrderBy(role => role)
                    .ToArray());
    }

    private string? GetRequestIpAddress()
    {
        var remoteIpAddress =
            HttpContext.Connection
                .RemoteIpAddress;

        if (remoteIpAddress?
                .IsIPv4MappedToIPv6 ==
            true)
        {
            remoteIpAddress =
                remoteIpAddress.MapToIPv4();
        }

        return remoteIpAddress?.ToString();
    }
}