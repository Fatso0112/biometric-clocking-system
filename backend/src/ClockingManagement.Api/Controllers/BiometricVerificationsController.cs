using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/biometric-verifications")]
[Authorize(Roles = ApplicationRoles.Employee)]
public sealed class BiometricVerificationsController
    : ControllerBase
{
    private static readonly TimeSpan TokenLifetime =
        TimeSpan.FromMinutes(5);

    private readonly ApplicationDbContext
        _dbContext;

    private readonly IBiometricVerificationService
        _biometricVerificationService;

    private readonly IVerificationTokenService
        _verificationTokenService;

    private readonly bool _mockVerificationEnabled;

    public BiometricVerificationsController(
        ApplicationDbContext dbContext,
        IBiometricVerificationService
            biometricVerificationService,
        IVerificationTokenService
            verificationTokenService,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _dbContext =
            dbContext;

        _biometricVerificationService =
            biometricVerificationService;

        _verificationTokenService =
            verificationTokenService;

        _mockVerificationEnabled =
            environment.IsDevelopment() ||
            configuration.GetValue<bool>(
                "Biometrics:EnableMockVerification");
    }

    [HttpPost("mock")]
    [EnableRateLimiting("BiometricVerification")]
    [ProducesResponseType(
        typeof(BiometricVerificationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<
        BiometricVerificationResponse>> VerifyMockFace(
        [FromBody]
        MockBiometricVerificationRequest request,
        CancellationToken cancellationToken)
    {
        if (!_mockVerificationEnabled)
        {
            return NotFound(new
            {
                errorCode =
                    "MOCK_BIOMETRIC_DISABLED",

                message =
                    "Mock biometric verification is disabled."
            });
        }

        var authenticatedEmployeeId =
            GetAuthenticatedEmployeeId();

        if (!authenticatedEmployeeId.HasValue)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "EMPLOYEE_ACCOUNT_NOT_LINKED",

                    message =
                        "The authenticated account is not linked to an employee record."
                });
        }

        if (string.IsNullOrWhiteSpace(
                request.EmployeeNumber))
        {
            return BadRequest(new
            {
                errorCode =
                    "EMPLOYEE_NUMBER_REQUIRED",

                message =
                    "An employee number is required."
            });
        }

        var employeeNumber =
            request.EmployeeNumber.Trim();

        if (!TryParseAttendanceAction(
                request.AttendanceAction,
                out var intendedEventType))
        {
            return BadRequest(new
            {
                errorCode =
                    "INVALID_ATTENDANCE_ACTION",

                message =
                    "The attendance action is not supported."
            });
        }

        var employee =
            await _dbContext.Employees
                .SingleOrDefaultAsync(
                    item =>
                        EF.Functions.ILike(
                            item.EmployeeNumber,
                            employeeNumber),
                    cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                errorCode =
                    "EMPLOYEE_NOT_FOUND",

                message =
                    "Employee was not found."
            });
        }

        if (employee.Id !=
            authenticatedEmployeeId.Value)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "EMPLOYEE_ACCESS_FORBIDDEN",

                    message =
                        "You may request biometric verification only for your linked employee record."
                });
        }

        if (!employee.IsActive)
        {
            return Conflict(new
            {
                errorCode =
                    "EMPLOYEE_INACTIVE",

                message =
                    "The employee account is inactive."
            });
        }

        var now =
            DateTimeOffset.UtcNow;

        var biometricProfile =
            await _dbContext.BiometricProfiles
                .AsNoTracking()
                .Include(profile =>
                    profile.Enrolments)
                .SingleOrDefaultAsync(
                    profile =>
                        profile.EmployeeId ==
                            employee.Id,
                    cancellationToken);

        if (biometricProfile is null)
        {
            await RecordRecognitionAttemptAsync(
                employeeId:
                    employee.Id,
                biometricEnrolmentId:
                    null,
                providerName:
                    "MockFace",
                outcome:
                    BiometricRecognitionOutcome
                        .NotEnrolled,
                confidence:
                    null,
                failureCode:
                    "BIOMETRIC_NOT_ENROLLED",
                attemptedAtUtc:
                    now,
                cancellationToken:
                    cancellationToken);

            return Conflict(new
            {
                errorCode =
                    "BIOMETRIC_NOT_ENROLLED",

                message =
                    "The employee does not have a biometric enrolment."
            });
        }

        if (!biometricProfile.IsActive)
        {
            await RecordRecognitionAttemptAsync(
                employeeId:
                    employee.Id,
                biometricEnrolmentId:
                    null,
                providerName:
                    "MockFace",
                outcome:
                    BiometricRecognitionOutcome
                        .ProfileDisabled,
                confidence:
                    null,
                failureCode:
                    "BIOMETRIC_PROFILE_DISABLED",
                attemptedAtUtc:
                    now,
                cancellationToken:
                    cancellationToken);

            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "BIOMETRIC_PROFILE_DISABLED",

                    message =
                        "The employee's biometric profile is disabled."
                });
        }

        var activeFaceEnrolment =
            biometricProfile.Enrolments
                .Where(enrolment =>
                    enrolment.Modality ==
                        BiometricModality.Face &&
                    enrolment.Status ==
                        BiometricEnrolmentStatus.Active)
                .OrderByDescending(enrolment =>
                    enrolment.EnrolledAtUtc)
                .FirstOrDefault();

        if (activeFaceEnrolment is null)
        {
            await RecordRecognitionAttemptAsync(
                employeeId:
                    employee.Id,
                biometricEnrolmentId:
                    null,
                providerName:
                    "MockFace",
                outcome:
                    BiometricRecognitionOutcome
                        .NotEnrolled,
                confidence:
                    null,
                failureCode:
                    "FACE_NOT_ENROLLED",
                attemptedAtUtc:
                    now,
                cancellationToken:
                    cancellationToken);

            return Conflict(new
            {
                errorCode =
                    "FACE_NOT_ENROLLED",

                message =
                    "The employee does not have an active face enrolment."
            });
        }

        var verificationResult =
            await _biometricVerificationService
                .VerifyAsync(
                    employee.Id,
                    cancellationToken);

        if (!verificationResult.IsVerified)
        {
            await RecordRecognitionAttemptAsync(
                employeeId:
                    employee.Id,
                biometricEnrolmentId:
                    activeFaceEnrolment.Id,
                providerName:
                    activeFaceEnrolment.ProviderName,
                outcome:
                    BiometricRecognitionOutcome.Failed,
                confidence:
                    verificationResult.Confidence,
                failureCode:
                    "BIOMETRIC_VERIFICATION_FAILED",
                attemptedAtUtc:
                    now,
                cancellationToken:
                    cancellationToken);

            return Unauthorized(new
            {
                errorCode =
                    "BIOMETRIC_VERIFICATION_FAILED",

                message =
                    verificationResult.Message
            });
        }

        var previousActiveSessions =
            await _dbContext
                .BiometricVerificationSessions
                .Where(session =>
                    session.EmployeeId ==
                        employee.Id &&
                    session.UsedAtUtc ==
                        null &&
                    session.ExpiresAtUtc >
                        now)
                .ToListAsync(
                    cancellationToken);

        foreach (var previousSession
                 in previousActiveSessions)
        {
            previousSession.ExpiresAtUtc =
                now;
        }

        var verificationToken =
            _verificationTokenService
                .GenerateToken();

        var tokenHash =
            _verificationTokenService
                .HashToken(
                    verificationToken);

        var session =
            new BiometricVerificationSession
            {
                EmployeeId =
                    employee.Id,

                TokenHash =
                    tokenHash,

                VerificationMethod =
                    VerificationMethod.MockFace,

                Confidence =
                    verificationResult.Confidence,

                IntendedEventType =
                    intendedEventType,

                ExpiresAtUtc =
                    now.Add(TokenLifetime),

                CreatedAtUtc =
                    now
            };

        var recognitionAttempt =
            new BiometricRecognitionAttempt
            {
                EmployeeId =
                    employee.Id,

                BiometricEnrolmentId =
                    activeFaceEnrolment.Id,

                Modality =
                    BiometricModality.Face,

                ProviderName =
                    activeFaceEnrolment.ProviderName,

                Outcome =
                    BiometricRecognitionOutcome
                        .Succeeded,

                Confidence =
                    verificationResult.Confidence,

                IpAddress =
                    GetRequestIpAddress(),

                AttemptedAtUtc =
                    now
            };

        _dbContext
            .BiometricVerificationSessions
            .Add(session);

        _dbContext
            .BiometricRecognitionAttempts
            .Add(recognitionAttempt);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response =
            new BiometricVerificationResponse(
                session.Id,
                employee.Id,
                employee.EmployeeNumber,
                $"{employee.FirstName} {employee.LastName}",
                verificationToken,
                session.Confidence,
                session.ExpiresAtUtc,
                IsMock:
                    true,
                verificationResult.Message);

        return Ok(response);
    }

    private async Task RecordRecognitionAttemptAsync(
        Guid employeeId,
        Guid? biometricEnrolmentId,
        string providerName,
        BiometricRecognitionOutcome outcome,
        decimal? confidence,
        string? failureCode,
        DateTimeOffset attemptedAtUtc,
        CancellationToken cancellationToken)
    {
        var attempt =
            new BiometricRecognitionAttempt
            {
                EmployeeId =
                    employeeId,

                BiometricEnrolmentId =
                    biometricEnrolmentId,

                Modality =
                    BiometricModality.Face,

                ProviderName =
                    providerName,

                Outcome =
                    outcome,

                Confidence =
                    confidence,

                FailureCode =
                    failureCode,

                IpAddress =
                    GetRequestIpAddress(),

                AttemptedAtUtc =
                    attemptedAtUtc
            };

        _dbContext
            .BiometricRecognitionAttempts
            .Add(attempt);

        await _dbContext.SaveChangesAsync(
            cancellationToken);
    }

    private static bool TryParseAttendanceAction(
        string value,
        out AttendanceEventType eventType)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "clockin":
            case "clock-in":
                eventType = AttendanceEventType.ClockIn;
                return true;

            case "breakstart":
            case "break-start":
                eventType = AttendanceEventType.BreakStart;
                return true;

            case "breakend":
            case "break-end":
                eventType = AttendanceEventType.BreakEnd;
                return true;

            case "clockout":
            case "clock-out":
                eventType = AttendanceEventType.ClockOut;
                return true;

            default:
                eventType = default;
                return false;
        }
    }

    private Guid? GetAuthenticatedEmployeeId()
    {
        var employeeIdValue =
            User.FindFirstValue(
                "employee_id");

        return Guid.TryParse(
            employeeIdValue,
            out var employeeId)
                ? employeeId
                : null;
    }

    private string? GetRequestIpAddress()
    {
        var remoteIpAddress =
            HttpContext.Connection
                .RemoteIpAddress;

        if (remoteIpAddress?
                .IsIPv4MappedToIPv6 ==
            true)
        {
            remoteIpAddress =
                remoteIpAddress.MapToIPv4();
        }

        return remoteIpAddress?
            .ToString();
    }
}