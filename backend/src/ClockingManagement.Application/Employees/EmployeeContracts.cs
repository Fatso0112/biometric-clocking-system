using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Employees;

public sealed record CreateEmployeeRequest(
    [Required]
    [StringLength(30, MinimumLength = 2)]
    string EmployeeNumber,

    [Required]
    [StringLength(100, MinimumLength = 2)]
    string FirstName,

    [Required]
    [StringLength(100, MinimumLength = 2)]
    string LastName,

    [EmailAddress]
    [StringLength(255)]
    string? Email,

    [Phone]
    [StringLength(30)]
    string? PhoneNumber,

    Guid DepartmentId,

    Guid WorkLocationId);

public sealed record EmployeeResponse(
    Guid Id,
    string EmployeeNumber,
    string FirstName,
    string LastName,
    string FullName,
    string? Email,
    string? PhoneNumber,
    Guid DepartmentId,
    string DepartmentName,
    Guid WorkLocationId,
    string WorkLocationName,
    bool IsActive,
    DateTimeOffset CreatedAtUtc);