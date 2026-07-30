using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Infrastructure.Biometrics;

public sealed class BiometricEnrolmentService
    : IBiometricEnrolmentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IFaceRecognitionProvider _faceProvider;
    private readonly IFingerprintRecognitionProvider _fingerprintProvider;

    public BiometricEnrolmentService(
        ApplicationDbContext dbContext,
        IFaceRecognitionProvider faceProvider,
        IFingerprintRecognitionProvider fingerprintProvider)
    {
        _dbContext = dbContext;
        _faceProvider = faceProvider;
        _fingerprintProvider = fingerprintProvider;
    }

    public async Task<BiometricEnrolmentOperationResult> EnrolAsync(
        Guid employeeId,
        BiometricModality modality,
        string? label,
        Guid createdByUserId,
        CancellationToken cancellationToken)
    {
        var employee =
            await _dbContext.Employees
                .Include(item => item.BiometricProfile)
                .ThenInclude(profile => profile!.Enrolments)
                .SingleOrDefaultAsync(
                    item => item.Id == employeeId,
                    cancellationToken);

        if (employee is null)
        {
            return Failure(
                "EMPLOYEE_NOT_FOUND",
                "The employee was not found.");
        }

        if (!employee.IsActive)
        {
            return Failure(
                "EMPLOYEE_INACTIVE",
                "Biometric enrolment cannot be created for an inactive employee.");
        }

        var profile = employee.BiometricProfile;

        if (profile is null)
        {
            profile =
                new BiometricProfile
                {
                    EmployeeId = employee.Id,
                    IsActive = true,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                };

            _dbContext.BiometricProfiles.Add(profile);
        }

        if (!profile.IsActive)
        {
            return Failure(
                "BIOMETRIC_PROFILE_DISABLED",
                "The employee's biometric profile is disabled.");
        }

        if (modality == BiometricModality.Face &&
            profile.Enrolments.Any(
                enrolment =>
                    enrolment.Modality == BiometricModality.Face &&
                    enrolment.Status == BiometricEnrolmentStatus.Active))
        {
            return Failure(
                "ACTIVE_FACE_ENROLMENT_EXISTS",
                "The employee already has an active face enrolment.");
        }

        ProviderEnrolmentResult providerResult;

        switch (modality)
        {
            case BiometricModality.Face:
                providerResult =
                    await _faceProvider.EnrolAsync(
                        employee.Id,
                        label,
                        cancellationToken);
                break;

            case BiometricModality.Fingerprint:
                providerResult =
                    await _fingerprintProvider.EnrolAsync(
                        employee.Id,
                        label,
                        cancellationToken);
                break;

            default:
                return Failure(
                    "UNSUPPORTED_BIOMETRIC_MODALITY",
                    "The biometric modality is not supported.");
        }

        var now = DateTimeOffset.UtcNow;

        var enrolment =
            new BiometricEnrolment
            {
                BiometricProfile = profile,
                Modality = modality,
                ProviderName = providerResult.ProviderName,
                ExternalReference = providerResult.ExternalReference,
                Label = string.IsNullOrWhiteSpace(label)
                    ? null
                    : label.Trim(),
                Status = BiometricEnrolmentStatus.Active,
                QualityScore = providerResult.QualityScore,
                CreatedByUserId = createdByUserId,
                EnrolledAtUtc = now,
                CreatedAtUtc = now
            };

        profile.UpdatedAtUtc = now;

        _dbContext.BiometricEnrolments.Add(enrolment);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BiometricEnrolmentOperationResult(
            true,
            null,
            providerResult.Message,
            enrolment);
    }

    public async Task<BiometricEnrolmentOperationResult> ChangeStatusAsync(
        Guid enrolmentId,
        BiometricEnrolmentStatus status,
        CancellationToken cancellationToken)
    {
        var enrolment =
            await _dbContext.BiometricEnrolments
                .Include(item => item.BiometricProfile)
                .SingleOrDefaultAsync(
                    item => item.Id == enrolmentId,
                    cancellationToken);

        if (enrolment is null)
        {
            return Failure(
                "BIOMETRIC_ENROLMENT_NOT_FOUND",
                "The biometric enrolment was not found.");
        }

        if (enrolment.Status == BiometricEnrolmentStatus.Revoked &&
            status != BiometricEnrolmentStatus.Revoked)
        {
            return Failure(
                "REVOKED_ENROLMENT_CANNOT_BE_REACTIVATED",
                "A revoked biometric enrolment cannot be reactivated.");
        }

        if (status == BiometricEnrolmentStatus.Active &&
            !enrolment.BiometricProfile.IsActive)
        {
            return Failure(
                "BIOMETRIC_PROFILE_DISABLED",
                "The biometric profile must be active before an enrolment can be activated.");
        }

        if (enrolment.Status == status)
        {
            return new BiometricEnrolmentOperationResult(
                true,
                null,
                "The biometric enrolment already has the requested status.",
                enrolment);
        }

        var now = DateTimeOffset.UtcNow;

        if (status == BiometricEnrolmentStatus.Revoked)
        {
            await RevokeProviderReferenceAsync(
                enrolment,
                cancellationToken);
        }

        enrolment.Status = status;
        enrolment.DisabledAtUtc =
            status == BiometricEnrolmentStatus.Active
                ? null
                : now;
        enrolment.UpdatedAtUtc = now;
        enrolment.BiometricProfile.UpdatedAtUtc = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BiometricEnrolmentOperationResult(
            true,
            null,
            $"The biometric enrolment status was changed to {status}.",
            enrolment);
    }

    private Task RevokeProviderReferenceAsync(
        BiometricEnrolment enrolment,
        CancellationToken cancellationToken)
    {
        return enrolment.Modality switch
        {
            BiometricModality.Face =>
                _faceProvider.RevokeAsync(
                    enrolment.ExternalReference,
                    cancellationToken),

            BiometricModality.Fingerprint =>
                _fingerprintProvider.RevokeAsync(
                    enrolment.ExternalReference,
                    cancellationToken),

            _ => Task.CompletedTask
        };
    }

    private static BiometricEnrolmentOperationResult Failure(
        string errorCode,
        string message)
    {
        return new BiometricEnrolmentOperationResult(
            false,
            errorCode,
            message,
            null);
    }
}
