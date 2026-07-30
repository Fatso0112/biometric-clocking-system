namespace BiometricClocking.Api.Models;

public class Employee
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string EmployeeNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string FingerprintId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}