namespace ClockingManagement.Domain.Entities;

public sealed class Employee
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string EmployeeNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public Guid DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    public Guid WorkLocationId { get; set; }

    public WorkLocation WorkLocation { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }
}