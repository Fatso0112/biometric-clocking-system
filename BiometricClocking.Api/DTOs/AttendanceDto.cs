namespace BiometricClocking.Api.DTOs;

public class AttendanceDto
{
    public Guid EmployeeId { get; set; }

    public string Status { get; set; } = "Present";
}