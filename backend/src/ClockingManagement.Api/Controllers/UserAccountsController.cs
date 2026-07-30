using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.UserAccounts;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Identity;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UserAccountsController
    : ControllerBase
{
    private readonly UserManager<ApplicationUser>
        _userManager;

    private readonly ApplicationDbContext
        _dbContext;

    public UserAccountsController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public async Task<ActionResult<
        PagedUserAccountsResponse>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(
            pageSize,
            1,
            100);

        IQueryable<ApplicationUser> query =
            _dbContext.Users
                .AsNoTracking()
                .Include(user =>
                    user.Employee);

        if (!string.IsNullOrWhiteSpace(
                search))
        {
            var searchPattern =
                $"%{search.Trim()}%";

            query =
                query.Where(user =>
                    EF.Functions.ILike(
                        user.Email ??
                            string.Empty,
                        searchPattern) ||
                    EF.Functions.ILike(
                        user.FirstName,
                        searchPattern) ||
                    EF.Functions.ILike(
                        user.LastName,
                        searchPattern) ||
                    (
                        user.Employee != null &&
                        EF.Functions.ILike(
                            user.Employee
                                .EmployeeNumber,
                            searchPattern)
                    ));
        }

        if (isActive.HasValue)
        {
            query =
                query.Where(user =>
                    user.IsActive ==
                        isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(
                role))
        {
            if (!TryNormalizeRole(
                    role,
                    out var normalizedRole))
            {
                return BadRequest(new
                {
                    errorCode =
                        "INVALID_ROLE",

                    message =
                        $"'{role}' is not a supported application role.",

                    supportedRoles =
                        ApplicationRoles.All
                });
            }

            var usersInRole =
                await _userManager
                    .GetUsersInRoleAsync(
                        normalizedRole);

            var userIds =
                usersInRole
                    .Select(user =>
                        user.Id)
                    .ToArray();

            query =
                query.Where(user =>
                    userIds.Contains(
                        user.Id));
        }

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var users =
            await query
                .OrderBy(user =>
                    user.Email)
                .Skip(
                    (page - 1) *
                    pageSize)
                .Take(pageSize)
                .ToListAsync(
                    cancellationToken);

        var responses =
            new List<UserAccountResponse>();

        foreach (var user in users)
        {
            var roles =
                (await _userManager
                    .GetRolesAsync(user))
                .ToArray();

            responses.Add(
                ToResponse(
                    user,
                    roles));
        }

        return Ok(
            new PagedUserAccountsResponse(
                Page:
                    page,
                PageSize:
                    pageSize,
                TotalCount:
                    totalCount,
                Items:
                    responses));
    }

    [HttpGet("roles")]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public ActionResult<
        AvailableRolesResponse> GetRoles()
    {
        return Ok(
            new AvailableRolesResponse(
                ApplicationRoles.All));
    }

    [HttpGet("{id:guid}")]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public async Task<ActionResult<
        UserAccountResponse>> GetUserById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var response =
            await LoadResponseAsync(
                id,
                cancellationToken);

        if (response is null)
        {
            return NotFound(new
            {
                errorCode =
                    "USER_NOT_FOUND",

                message =
                    "The user account was not found."
            });
        }

        return Ok(response);
    }

    [HttpPost]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public async Task<ActionResult<
        UserAccountResponse>> CreateUser(
        [FromBody]
        CreateUserAccountRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedEmail =
            request.Email.Trim();

        var existingUser =
            await _userManager
                .FindByEmailAsync(
                    normalizedEmail);

        if (existingUser is not null)
        {
            return Conflict(new
            {
                errorCode =
                    "EMAIL_ALREADY_EXISTS",

                message =
                    "A user account with this email address already exists."
            });
        }

        Employee? employee = null;

        if (request.EmployeeId.HasValue)
        {
            employee =
                await _dbContext.Employees
                    .AsNoTracking()
                    .SingleOrDefaultAsync(
                        item =>
                            item.Id ==
                            request.EmployeeId.Value,
                        cancellationToken);

            if (employee is null)
            {
                return BadRequest(new
                {
                    errorCode =
                        "EMPLOYEE_NOT_FOUND",

                    message =
                        "The selected employee record was not found."
                });
            }

            var employeeAlreadyLinked =
                await _dbContext.Users
                    .AsNoTracking()
                    .AnyAsync(
                        user =>
                            user.EmployeeId ==
                            employee.Id,
                        cancellationToken);

            if (employeeAlreadyLinked)
            {
                return Conflict(new
                {
                    errorCode =
                        "EMPLOYEE_ACCOUNT_ALREADY_EXISTS",

                    message =
                        "The selected employee is already linked to a user account."
                });
            }
        }

        if (!TryNormalizeRoles(
                request.Roles,
                out var normalizedRoles,
                out var invalidRole))
        {
            return BadRequest(new
            {
                errorCode =
                    "INVALID_ROLE",

                message =
                    $"'{invalidRole}' is not a supported application role.",

                supportedRoles =
                    ApplicationRoles.All
            });
        }

        if (normalizedRoles.Length == 0)
        {
            if (request.EmployeeId.HasValue)
            {
                normalizedRoles =
                    new[]
                    {
                        ApplicationRoles.Employee
                    };
            }
            else
            {
                return BadRequest(new
                {
                    errorCode =
                        "ROLE_REQUIRED",

                    message =
                        "At least one role is required for an account that is not linked to an employee."
                });
            }
        }

        var callerIsSystemAdministrator =
            User.IsInRole(
                ApplicationRoles
                    .SystemAdministrator);

        if (!callerIsSystemAdministrator)
        {
            var containsRestrictedRole =
                normalizedRoles.Any(role =>
                    !string.Equals(
                        role,
                        ApplicationRoles.Employee,
                        StringComparison.Ordinal));

            if (containsRestrictedRole ||
                !request.EmployeeId.HasValue)
            {
                return StatusCode(
                    StatusCodes
                        .Status403Forbidden,
                    new
                    {
                        errorCode =
                            "ROLE_ASSIGNMENT_FORBIDDEN",

                        message =
                            "HR officers may create only employee accounts with the Employee role."
                    });
            }
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        var user =
            new ApplicationUser
            {
                Id =
                    Guid.NewGuid(),

                UserName =
                    normalizedEmail,

                Email =
                    normalizedEmail,

                EmailConfirmed =
                    true,

                FirstName =
                    request.FirstName.Trim(),

                LastName =
                    request.LastName.Trim(),

                PhoneNumber =
                    string.IsNullOrWhiteSpace(
                        request.PhoneNumber)
                        ? null
                        : request.PhoneNumber.Trim(),

                EmployeeId =
                    request.EmployeeId,

                IsActive =
                    true,

                LockoutEnabled =
                    true,

                CreatedAtUtc =
                    DateTimeOffset.UtcNow
            };

        var creationResult =
            await _userManager.CreateAsync(
                user,
                request.Password);

        if (!creationResult.Succeeded)
        {
            return BadRequest(
                CreateIdentityErrorResponse(
                    "USER_CREATION_FAILED",
                    "The user account could not be created.",
                    creationResult));
        }

        var roleResult =
            await _userManager.AddToRolesAsync(
                user,
                normalizedRoles);

        if (!roleResult.Succeeded)
        {
            return BadRequest(
                CreateIdentityErrorResponse(
                    "ROLE_ASSIGNMENT_FAILED",
                    "The account was created, but its roles could not be assigned.",
                    roleResult));
        }

        await transaction.CommitAsync(
            cancellationToken);

        var response =
            await LoadResponseAsync(
                user.Id,
                cancellationToken);

        return CreatedAtAction(
            nameof(GetUserById),
            new
            {
                id = user.Id
            },
            response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public async Task<ActionResult<
        UserAccountResponse>> UpdateUser(
        Guid id,
        [FromBody]
        UpdateUserAccountRequest request,
        CancellationToken cancellationToken)
    {
        var user =
            await _dbContext.Users
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == id,
                    cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                errorCode =
                    "USER_NOT_FOUND",

                message =
                    "The user account was not found."
            });
        }

        if (!User.IsInRole(
                ApplicationRoles
                    .SystemAdministrator) &&
            await _userManager.IsInRoleAsync(
                user,
                ApplicationRoles
                    .SystemAdministrator))
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "ADMIN_ACCOUNT_MODIFICATION_FORBIDDEN",

                    message =
                        "Only a system administrator may modify another system administrator account."
                });
        }

        var normalizedEmail =
            request.Email.Trim();

        var userWithEmail =
            await _userManager.FindByEmailAsync(
                normalizedEmail);

        if (userWithEmail is not null &&
            userWithEmail.Id != user.Id)
        {
            return Conflict(new
            {
                errorCode =
                    "EMAIL_ALREADY_EXISTS",

                message =
                    "Another account already uses this email address."
            });
        }

        if (request.EmployeeId.HasValue)
        {
            var employeeExists =
                await _dbContext.Employees
                    .AsNoTracking()
                    .AnyAsync(
                        employee =>
                            employee.Id ==
                            request.EmployeeId.Value,
                        cancellationToken);

            if (!employeeExists)
            {
                return BadRequest(new
                {
                    errorCode =
                        "EMPLOYEE_NOT_FOUND",

                    message =
                        "The selected employee record was not found."
                });
            }

            var employeeAlreadyLinked =
                await _dbContext.Users
                    .AsNoTracking()
                    .AnyAsync(
                        existing =>
                            existing.EmployeeId ==
                                request.EmployeeId.Value &&
                            existing.Id != user.Id,
                        cancellationToken);

            if (employeeAlreadyLinked)
            {
                return Conflict(new
                {
                    errorCode =
                        "EMPLOYEE_ACCOUNT_ALREADY_EXISTS",

                    message =
                        "The selected employee is already linked to another user account."
                });
            }
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        if (!string.Equals(
                user.Email,
                normalizedEmail,
                StringComparison.OrdinalIgnoreCase))
        {
            var emailResult =
                await _userManager.SetEmailAsync(
                    user,
                    normalizedEmail);

            if (!emailResult.Succeeded)
            {
                return BadRequest(
                    CreateIdentityErrorResponse(
                        "EMAIL_UPDATE_FAILED",
                        "The email address could not be updated.",
                        emailResult));
            }

            var usernameResult =
                await _userManager
                    .SetUserNameAsync(
                        user,
                        normalizedEmail);

            if (!usernameResult.Succeeded)
            {
                return BadRequest(
                    CreateIdentityErrorResponse(
                        "USERNAME_UPDATE_FAILED",
                        "The login username could not be updated.",
                        usernameResult));
            }

            user.EmailConfirmed = true;
        }

        user.FirstName =
            request.FirstName.Trim();

        user.LastName =
            request.LastName.Trim();

        user.PhoneNumber =
            string.IsNullOrWhiteSpace(
                request.PhoneNumber)
                ? null
                : request.PhoneNumber.Trim();

        user.EmployeeId =
            request.EmployeeId;

        user.UpdatedAtUtc =
            DateTimeOffset.UtcNow;

        var updateResult =
            await _userManager.UpdateAsync(
                user);

        if (!updateResult.Succeeded)
        {
            return BadRequest(
                CreateIdentityErrorResponse(
                    "USER_UPDATE_FAILED",
                    "The user account could not be updated.",
                    updateResult));
        }

        await transaction.CommitAsync(
            cancellationToken);

        var response =
            await LoadResponseAsync(
                user.Id,
                cancellationToken);

        return Ok(response);
    }

    [HttpPut("{id:guid}/roles")]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserRoles)]
    public async Task<ActionResult<
        UserAccountResponse>> UpdateRoles(
        Guid id,
        [FromBody]
        UpdateUserRolesRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizeRoles(
                request.Roles,
                out var requestedRoles,
                out var invalidRole))
        {
            return BadRequest(new
            {
                errorCode =
                    "INVALID_ROLE",

                message =
                    $"'{invalidRole}' is not a supported application role.",

                supportedRoles =
                    ApplicationRoles.All
            });
        }

        if (requestedRoles.Length == 0)
        {
            return BadRequest(new
            {
                errorCode =
                    "ROLE_REQUIRED",

                message =
                    "A user account must have at least one role."
            });
        }

        var user =
            await _userManager.FindByIdAsync(
                id.ToString());

        if (user is null)
        {
            return NotFound(new
            {
                errorCode =
                    "USER_NOT_FOUND",

                message =
                    "The user account was not found."
            });
        }

        var currentRoles =
            (await _userManager
                .GetRolesAsync(user))
            .ToArray();

        var currentUserId =
            GetCurrentUserId();

        var removingSystemAdministrator =
            currentRoles.Contains(
                ApplicationRoles
                    .SystemAdministrator,
                StringComparer.Ordinal) &&
            !requestedRoles.Contains(
                ApplicationRoles
                    .SystemAdministrator,
                StringComparer.Ordinal);

        if (user.Id == currentUserId &&
            removingSystemAdministrator)
        {
            return Conflict(new
            {
                errorCode =
                    "CANNOT_REMOVE_OWN_ADMIN_ROLE",

                message =
                    "You cannot remove the SystemAdministrator role from your own account."
            });
        }

        if (removingSystemAdministrator)
        {
            var administrators =
                await _userManager
                    .GetUsersInRoleAsync(
                        ApplicationRoles
                            .SystemAdministrator);

            var activeAdministratorCount =
                administrators.Count(
                    administrator =>
                        administrator.IsActive);

            if (activeAdministratorCount <= 1 &&
                user.IsActive)
            {
                return Conflict(new
                {
                    errorCode =
                        "LAST_SYSTEM_ADMINISTRATOR",

                    message =
                        "The SystemAdministrator role cannot be removed from the last active system administrator."
                });
            }
        }

        var rolesToRemove =
            currentRoles
                .Except(
                    requestedRoles,
                    StringComparer.Ordinal)
                .ToArray();

        var rolesToAdd =
            requestedRoles
                .Except(
                    currentRoles,
                    StringComparer.Ordinal)
                .ToArray();

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        if (rolesToRemove.Length > 0)
        {
            var removalResult =
                await _userManager
                    .RemoveFromRolesAsync(
                        user,
                        rolesToRemove);

            if (!removalResult.Succeeded)
            {
                return BadRequest(
                    CreateIdentityErrorResponse(
                        "ROLE_REMOVAL_FAILED",
                        "One or more roles could not be removed.",
                        removalResult));
            }
        }

        if (rolesToAdd.Length > 0)
        {
            var additionResult =
                await _userManager
                    .AddToRolesAsync(
                        user,
                        rolesToAdd);

            if (!additionResult.Succeeded)
            {
                return BadRequest(
                    CreateIdentityErrorResponse(
                        "ROLE_ASSIGNMENT_FAILED",
                        "One or more roles could not be assigned.",
                        additionResult));
            }
        }

        user.UpdatedAtUtc =
            DateTimeOffset.UtcNow;

        var updateResult =
            await _userManager.UpdateAsync(
                user);

        if (!updateResult.Succeeded)
        {
            return BadRequest(
                CreateIdentityErrorResponse(
                    "USER_UPDATE_FAILED",
                    "The account roles were changed, but the account could not be updated.",
                    updateResult));
        }

        await transaction.CommitAsync(
            cancellationToken);

        var response =
            await LoadResponseAsync(
                user.Id,
                cancellationToken);

        return Ok(response);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(
        Policy =
            AuthorizationPolicies
                .ManageUserAccounts)]
    public async Task<ActionResult<
        UserAccountResponse>> UpdateStatus(
        Guid id,
        [FromBody]
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var user =
            await _userManager.FindByIdAsync(
                id.ToString());

        if (user is null)
        {
            return NotFound(new
            {
                errorCode =
                    "USER_NOT_FOUND",

                message =
                    "The user account was not found."
            });
        }

        var currentUserId =
            GetCurrentUserId();

        if (!request.IsActive &&
            user.Id == currentUserId)
        {
            return Conflict(new
            {
                errorCode =
                    "CANNOT_DISABLE_OWN_ACCOUNT",

                message =
                    "You cannot disable your own account."
            });
        }

        var targetIsSystemAdministrator =
            await _userManager.IsInRoleAsync(
                user,
                ApplicationRoles
                    .SystemAdministrator);

        if (!User.IsInRole(
                ApplicationRoles
                    .SystemAdministrator) &&
            targetIsSystemAdministrator)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "ADMIN_ACCOUNT_MODIFICATION_FORBIDDEN",

                    message =
                        "Only a system administrator may change another system administrator account."
                });
        }

        if (!request.IsActive &&
            targetIsSystemAdministrator &&
            user.IsActive)
        {
            var administrators =
                await _userManager
                    .GetUsersInRoleAsync(
                        ApplicationRoles
                            .SystemAdministrator);

            var activeAdministratorCount =
                administrators.Count(
                    administrator =>
                        administrator.IsActive);

            if (activeAdministratorCount <= 1)
            {
                return Conflict(new
                {
                    errorCode =
                        "LAST_SYSTEM_ADMINISTRATOR",

                    message =
                        "The last active system administrator cannot be disabled."
                });
            }
        }

        var now =
            DateTimeOffset.UtcNow;

        user.IsActive =
            request.IsActive;

        user.UpdatedAtUtc =
            now;

        if (request.IsActive)
        {
            user.LockoutEnd =
                null;

            user.AccessFailedCount =
                0;
        }
        else
        {
            var activeRefreshTokens =
                await _dbContext.RefreshTokens
                    .Where(token =>
                        token.UserId ==
                            user.Id &&
                        token.RevokedAtUtc ==
                            null)
                    .ToListAsync(
                        cancellationToken);

            foreach (var refreshToken
                     in activeRefreshTokens)
            {
                refreshToken.RevokedAtUtc =
                    now;

                refreshToken
                    .RevokedByIpAddress =
                        GetRequestIpAddress();
            }
        }

        var updateResult =
            await _userManager.UpdateAsync(
                user);

        if (!updateResult.Succeeded)
        {
            return BadRequest(
                CreateIdentityErrorResponse(
                    "USER_STATUS_UPDATE_FAILED",
                    "The account status could not be updated.",
                    updateResult));
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response =
            await LoadResponseAsync(
                user.Id,
                cancellationToken);

        return Ok(response);
    }

    private async Task<UserAccountResponse?>
        LoadResponseAsync(
            Guid userId,
            CancellationToken cancellationToken)
    {
        var user =
            await _dbContext.Users
                .AsNoTracking()
                .Include(item =>
                    item.Employee)
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == userId,
                    cancellationToken);

        if (user is null)
        {
            return null;
        }

        var roles =
            (await _userManager
                .GetRolesAsync(user))
            .ToArray();

        return ToResponse(
            user,
            roles);
    }

    private static UserAccountResponse
        ToResponse(
            ApplicationUser user,
            IReadOnlyCollection<string> roles)
    {
        var isLockedOut =
            user.LockoutEnd.HasValue &&
            user.LockoutEnd.Value >
                DateTimeOffset.UtcNow;

        return new UserAccountResponse(
            Id:
                user.Id,
            Email:
                user.Email ??
                string.Empty,
            FirstName:
                user.FirstName,
            LastName:
                user.LastName,
            PhoneNumber:
                user.PhoneNumber,
            EmployeeId:
                user.EmployeeId,
            EmployeeNumber:
                user.Employee?
                    .EmployeeNumber,
            EmployeeName:
                user.Employee is null
                    ? null
                    : $"{user.Employee.FirstName} {user.Employee.LastName}",
            IsActive:
                user.IsActive,
            IsLockedOut:
                isLockedOut,
            LockoutEndUtc:
                user.LockoutEnd,
            Roles:
                roles
                    .OrderBy(role => role)
                    .ToArray(),
            CreatedAtUtc:
                user.CreatedAtUtc,
            UpdatedAtUtc:
                user.UpdatedAtUtc);
    }

    private static bool TryNormalizeRole(
        string requestedRole,
        out string normalizedRole)
    {
        var matchingRole =
            ApplicationRoles.All
                .FirstOrDefault(role =>
                    string.Equals(
                        role,
                        requestedRole.Trim(),
                        StringComparison
                            .OrdinalIgnoreCase));

        if (matchingRole is null)
        {
            normalizedRole =
                string.Empty;

            return false;
        }

        normalizedRole =
            matchingRole;

        return true;
    }

    private static bool TryNormalizeRoles(
        IEnumerable<string>? requestedRoles,
        out string[] normalizedRoles,
        out string? invalidRole)
    {
        var result =
            new List<string>();

        foreach (var requestedRole in
                 requestedRoles ??
                 Array.Empty<string>())
        {
            if (string.IsNullOrWhiteSpace(
                    requestedRole))
            {
                continue;
            }

            if (!TryNormalizeRole(
                    requestedRole,
                    out var normalizedRole))
            {
                normalizedRoles =
                    Array.Empty<string>();

                invalidRole =
                    requestedRole;

                return false;
            }

            if (!result.Contains(
                    normalizedRole,
                    StringComparer.Ordinal))
            {
                result.Add(
                    normalizedRole);
            }
        }

        normalizedRoles =
            result
                .OrderBy(role => role)
                .ToArray();

        invalidRole =
            null;

        return true;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out var userId)
                ? userId
                : null;
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

        return remoteIpAddress?
            .ToString();
    }

    private static object
        CreateIdentityErrorResponse(
            string errorCode,
            string message,
            IdentityResult identityResult)
    {
        return new
        {
            errorCode,
            message,
            identityErrors =
                identityResult.Errors
                    .Select(error =>
                        new
                        {
                            error.Code,
                            error.Description
                        })
                    .ToArray()
        };
    }
}