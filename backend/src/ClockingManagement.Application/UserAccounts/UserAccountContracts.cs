using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.UserAccounts;

public sealed record CreateUserAccountRequest(
    [Required]
    [EmailAddress]
    [StringLength(256)]
    string Email,

    [Required]
    [StringLength(100, MinimumLength = 1)]
    string FirstName,

    [Required]
    [StringLength(100, MinimumLength = 1)]
    string LastName,

    [Phone]
    [StringLength(30)]
    string? PhoneNumber,

    [Required]
    [StringLength(200, MinimumLength = 8)]
    string Password,

    Guid? EmployeeId,

    IReadOnlyCollection<string>? Roles);

public sealed record UpdateUserAccountRequest(
    [Required]
    [EmailAddress]
    [StringLength(256)]
    string Email,

    [Required]
    [StringLength(100, MinimumLength = 1)]
    string FirstName,

    [Required]
    [StringLength(100, MinimumLength = 1)]
    string LastName,

    [Phone]
    [StringLength(30)]
    string? PhoneNumber,

    Guid? EmployeeId);

public sealed record UpdateUserRolesRequest(
    IReadOnlyCollection<string>? Roles);

public sealed record UpdateUserStatusRequest(
    bool IsActive);

public sealed record UserAccountResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    Guid? EmployeeId,
    string? EmployeeNumber,
    string? EmployeeName,
    bool IsActive,
    bool IsLockedOut,
    DateTimeOffset? LockoutEndUtc,
    IReadOnlyCollection<string> Roles,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record PagedUserAccountsResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<UserAccountResponse> Items);

public sealed record AvailableRolesResponse(
    IReadOnlyCollection<string> Roles);