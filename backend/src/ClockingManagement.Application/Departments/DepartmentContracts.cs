using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.Application.Departments;

public sealed record CreateDepartmentRequest(
    [Required]
    [StringLength(100, MinimumLength = 2)]
    string Name,

    [StringLength(500)]
    string? Description);

public sealed record DepartmentResponse(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTimeOffset CreatedAtUtc);