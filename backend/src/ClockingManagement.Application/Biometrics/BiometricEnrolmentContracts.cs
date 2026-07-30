using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;

namespace ClockingManagement.Application.Biometrics;

public sealed record CreateMockBiometricEnrolmentRequest(
    Guid EmployeeId,
    string Modality,
    string? Label);

public sealed record UpdateBiometricEnrolmentStatusRequest(
    string Status);

public sealed record UpdateBiometricProfileStatusRequest(
    bool IsActive);

public sealed record BiometricEnrolmentResponse(
    Guid Id,
    Guid BiometricProfileId,
    string Modality,
    string ProviderName,
    string ExternalReference,
    string? Label,
    string Status,
    decimal? QualityScore,
    Guid? CreatedByUserId,
    DateTimeOffset EnrolledAtUtc,
    DateTimeOffset? DisabledAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record BiometricProfileResponse(
    Guid Id,
    Guid EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    bool IsActive,
    int ActiveEnrolmentCount,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    IReadOnlyCollection<BiometricEnrolmentResponse> Enrolments);

public sealed record ProviderEnrolmentResult(
    string ProviderName,
    string ExternalReference,
    decimal? QualityScore,
    string Message);

public sealed record BiometricEnrolmentOperationResult(
    bool Succeeded,
    string? ErrorCode,
    string Message,
    BiometricEnrolment? Enrolment);

public interface IFaceRecognitionProvider
{
    Task<ProviderEnrolmentResult> EnrolAsync(
        Guid employeeId,
        string? label,
        CancellationToken cancellationToken);

    Task RevokeAsync(
        string externalReference,
        CancellationToken cancellationToken);
}

public interface IFingerprintRecognitionProvider
{
    Task<ProviderEnrolmentResult> EnrolAsync(
        Guid employeeId,
        string? label,
        CancellationToken cancellationToken);

    Task RevokeAsync(
        string externalReference,
        CancellationToken cancellationToken);
}

public interface IBiometricEnrolmentService
{
    Task<BiometricEnrolmentOperationResult> EnrolAsync(
        Guid employeeId,
        BiometricModality modality,
        string? label,
        Guid createdByUserId,
        CancellationToken cancellationToken);

    Task<BiometricEnrolmentOperationResult> ChangeStatusAsync(
        Guid enrolmentId,
        BiometricEnrolmentStatus status,
        CancellationToken cancellationToken);
}
