namespace ClockingManagement.Domain.Entities;

public sealed class BiometricProfile
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public Employee Employee { get; set; } =
        null!;

    public bool IsActive { get; set; } =
        true;

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public ICollection<BiometricEnrolment>
        Enrolments { get; set; } =
            new List<BiometricEnrolment>();
}