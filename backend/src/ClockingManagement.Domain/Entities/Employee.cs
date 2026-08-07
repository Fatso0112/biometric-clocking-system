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

    public ICollection<AttendanceEvent> AttendanceEvents { get; set; } =
        new List<AttendanceEvent>();

    public ICollection<BiometricVerificationSession>
        BiometricVerificationSessions { get; set; } =
            new List<BiometricVerificationSession>();

    public BiometricProfile? BiometricProfile
    { get; set; }

    public ICollection<BiometricRegistrationRequest>
        BiometricRegistrationRequests { get; set; } =
            new List<BiometricRegistrationRequest>();

    public ICollection<BiometricRecognitionAttempt>
        BiometricRecognitionAttempts { get; set; } =
            new List<BiometricRecognitionAttempt>();

    public ICollection<WebAuthnCredential>
        WebAuthnCredentials { get; set; } =
            new List<WebAuthnCredential>();

    public ICollection<PayrollEntry> PayrollEntries { get; set; } =
        new List<PayrollEntry>();

    public ICollection<PayRateHistory> PayRateHistory { get; set; } =
        new List<PayRateHistory>();

    public ICollection<WebAuthnChallenge>
        WebAuthnChallenges { get; set; } =
            new List<WebAuthnChallenge>();
}