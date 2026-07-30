namespace BiometricClocking.Api.DTOs;

public class EmployeeDto
{
    public string EmployeeNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string FingerprintId { get; set; } = string.Empty;
}