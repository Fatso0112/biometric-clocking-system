namespace BiometricClocking.Api.Models;

public class Attendance
{
    public Guid Id { get; set; } = Guid.NewGuid();


    public Guid EmployeeId { get; set; }


    public Employee? Employee { get; set; }


    public DateTime CheckInTime { get; set; }

    public string Status { get; set; } = "Present";
}