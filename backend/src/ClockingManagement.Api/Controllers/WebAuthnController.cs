using System.Data;
using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/webauthn")]
[Authorize(Roles = ApplicationRoles.Employee)]
public sealed class WebAuthnController : ControllerBase
{
    private static readonly TimeSpan ChallengeLifetime =
        TimeSpan.FromMinutes(5);

    private static readonly TimeSpan VerificationTokenLifetime =
        TimeSpan.FromMinutes(5);

    private readonly ApplicationDbContext _dbContext;
    private readonly IFido2 _fido2;
    private readonly IVerificationTokenService _verificationTokenService;
    private readonly ILogger<WebAuthnController> _logger;

    public WebAuthnController(
        ApplicationDbContext dbContext,
        IFido2 fido2,
        IVerificationTokenService verificationTokenService,
        ILogger<WebAuthnController> logger)
    {
        _dbContext = dbContext;
        _fido2 = fido2;
        _verificationTokenService = verificationTokenService;
        _logger = logger;
    }

    [HttpGet("credentials")]
    public async Task<ActionResult<
        IReadOnlyCollection<WebAuthnCredentialResponse>>> GetCredentials(
        CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        var credentials = await _dbContext.WebAuthnCredentials
            .AsNoTracking()
            .Where(item =>
                item.EmployeeId == employeeId.Value &&
                item.IsActive)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Select(item => new WebAuthnCredentialResponse(
                item.Id,
                item.DeviceName,
                item.CreatedAtUtc,
                item.LastUsedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(credentials);
    }

    [HttpDelete("credentials/{id:guid}")]
    public async Task<IActionResult> RevokeCredential(
        Guid id,
        CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        var credential = await _dbContext.WebAuthnCredentials
            .SingleOrDefaultAsync(
                item =>
                    item.Id == id &&
                    item.EmployeeId == employeeId.Value,
                cancellationToken);

        if (credential is null)
        {
            return NotFound(new
            {
                errorCode = "WEBAUTHN_CREDENTIAL_NOT_FOUND",
                message = "The registered device credential was not found."
            });
        }

        credential.IsActive = false;
        credential.RevokedAtUtc = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("registration/options")]
    [EnableRateLimiting("BiometricVerification")]
    public async Task<ActionResult<WebAuthnOptionsResponse>>
        CreateRegistrationOptions(
            [FromBody] BeginWebAuthnRegistrationRequest request,
            CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        var employee = await _dbContext.Employees
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == employeeId.Value,
                cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                errorCode = "EMPLOYEE_NOT_FOUND",
                message = "The linked employee record was not found."
            });
        }

        if (!employee.IsActive)
        {
            return Conflict(new
            {
                errorCode = "EMPLOYEE_INACTIVE",
                message = "The employee account is inactive."
            });
        }

        var existingCredentials = await _dbContext.WebAuthnCredentials
            .AsNoTracking()
            .Where(item =>
                item.EmployeeId == employee.Id &&
                item.IsActive)
            .Select(item => item.CredentialId)
            .ToListAsync(cancellationToken);

        var user = new Fido2User
        {
            Id = employee.Id.ToByteArray(),
            Name = employee.Email ?? employee.EmployeeNumber,
            DisplayName = $"{employee.FirstName} {employee.LastName}"
        };

        var options = _fido2.RequestNewCredential(
            new RequestNewCredentialParams
            {
                User = user,
                ExcludeCredentials = existingCredentials
                    .Select(ToDescriptor)
                    .ToList(),
                AuthenticatorSelection =
                    new AuthenticatorSelection
                    {
                        AuthenticatorAttachment =
                            AuthenticatorAttachment.Platform,
                        ResidentKey =
                            ResidentKeyRequirement.Preferred,
                        UserVerification =
                            UserVerificationRequirement.Required
                    },
                AttestationPreference =
                    AttestationConveyancePreference.None,
                Extensions = new AuthenticationExtensionsClientInputs
                {
                    CredProps = true
                }
            });

        var now = DateTimeOffset.UtcNow;
        await ExpireOutstandingChallengesAsync(
            employee.Id,
            WebAuthnCeremonyType.Registration,
            now,
            cancellationToken);

        var challenge = new WebAuthnChallenge
        {
            EmployeeId = employee.Id,
            CeremonyType = WebAuthnCeremonyType.Registration,
            OptionsJson = options.ToJson(),
            ExpiresAtUtc = now.Add(ChallengeLifetime),
            CreatedAtUtc = now
        };

        _dbContext.WebAuthnChallenges.Add(challenge);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new WebAuthnOptionsResponse(
            challenge.Id,
            options));
    }

    [HttpPost("registration/complete")]
    [EnableRateLimiting("BiometricVerification")]
    public async Task<ActionResult<WebAuthnCredentialResponse>>
        CompleteRegistration(
            [FromBody] CompleteWebAuthnRegistrationRequest request,
            CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var challenge = await _dbContext.WebAuthnChallenges
            .SingleOrDefaultAsync(
                item =>
                    item.Id == request.ChallengeId &&
                    item.EmployeeId == employeeId.Value &&
                    item.CeremonyType ==
                        WebAuthnCeremonyType.Registration,
                cancellationToken);

        var challengeError = ValidateChallenge(challenge);
        if (challengeError is not null)
        {
            return challengeError;
        }

        var originalOptions =
            CredentialCreateOptions.FromJson(
                challenge!.OptionsJson);

        try
        {
            IsCredentialIdUniqueToUserAsyncDelegate callback =
                async (args, token) =>
                {
                    var credentialId =
                        WebEncoders.Base64UrlEncode(
                            args.CredentialId);

                    return !await _dbContext.WebAuthnCredentials
                        .AnyAsync(
                            item =>
                                item.CredentialId == credentialId,
                            token);
                };

            var result = await _fido2.MakeNewCredentialAsync(
                new MakeNewCredentialParams
                {
                    AttestationResponse = request.Credential,
                    OriginalOptions = originalOptions,
                    IsCredentialIdUniqueToUserCallback = callback
                },
                cancellationToken: cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var credential = new WebAuthnCredential
            {
                EmployeeId = employeeId.Value,
                CredentialId =
                    WebEncoders.Base64UrlEncode(result.Id),
                PublicKey = result.PublicKey,
                UserHandle = result.User.Id,
                SignCount = result.SignCount,
                AaGuid = result.AaGuid,
                Transports = result.Transports is null
                    ? null
                    : string.Join(
                        ',',
                        result.Transports.Select(
                            item => item.ToString())),
                DeviceName = NormalizeDeviceName(
                    request.DeviceName),
                CreatedAtUtc = now,
                IsActive = true
            };

            challenge.UsedAtUtc = now;
            _dbContext.WebAuthnCredentials.Add(credential);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return StatusCode(
                StatusCodes.Status201Created,
                new WebAuthnCredentialResponse(
                    credential.Id,
                    credential.DeviceName,
                    credential.CreatedAtUtc,
                    credential.LastUsedAtUtc));
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);

            _logger.LogWarning(
                exception,
                "WebAuthn registration verification failed for employee {EmployeeId}.",
                employeeId.Value);

            return BadRequest(new
            {
                errorCode = "WEBAUTHN_REGISTRATION_FAILED",
                message = "The device credential could not be verified. Start the registration again."
            });
        }
    }

    [HttpPost("authentication/options")]
    [EnableRateLimiting("BiometricVerification")]
    public async Task<ActionResult<WebAuthnOptionsResponse>>
        CreateAuthenticationOptions(
            [FromBody] BeginWebAuthnAuthenticationRequest request,
            CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        if (!TryParseAttendanceAction(
                request.AttendanceAction,
                out var intendedEventType))
        {
            return BadRequest(new
            {
                errorCode = "INVALID_ATTENDANCE_ACTION",
                message = "The attendance action is not supported."
            });
        }

        var credentials = await _dbContext.WebAuthnCredentials
            .AsNoTracking()
            .Where(item =>
                item.EmployeeId == employeeId.Value &&
                item.IsActive)
            .Select(item => item.CredentialId)
            .ToListAsync(cancellationToken);

        if (credentials.Count == 0)
        {
            return Conflict(new
            {
                errorCode = "DEVICE_BIOMETRIC_NOT_ENROLLED",
                message = "Register this phone before using device verification for attendance."
            });
        }

        var options = _fido2.GetAssertionOptions(
            new GetAssertionOptionsParams
            {
                AllowedCredentials = credentials
                    .Select(ToDescriptor)
                    .ToList(),
                UserVerification =
                    UserVerificationRequirement.Required
            });

        var now = DateTimeOffset.UtcNow;
        await ExpireOutstandingChallengesAsync(
            employeeId.Value,
            WebAuthnCeremonyType.Authentication,
            now,
            cancellationToken);

        var challenge = new WebAuthnChallenge
        {
            EmployeeId = employeeId.Value,
            CeremonyType = WebAuthnCeremonyType.Authentication,
            IntendedEventType = intendedEventType,
            OptionsJson = options.ToJson(),
            ExpiresAtUtc = now.Add(ChallengeLifetime),
            CreatedAtUtc = now
        };

        _dbContext.WebAuthnChallenges.Add(challenge);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new WebAuthnOptionsResponse(
            challenge.Id,
            options));
    }

    [HttpPost("authentication/complete")]
    [EnableRateLimiting("BiometricVerification")]
    public async Task<ActionResult<BiometricVerificationResponse>>
        CompleteAuthentication(
            [FromBody] CompleteWebAuthnAuthenticationRequest request,
            CancellationToken cancellationToken)
    {
        var employeeId = GetAuthenticatedEmployeeId();

        if (!employeeId.HasValue)
        {
            return EmployeeAccountNotLinked();
        }

        if (!TryParseAttendanceAction(
                request.AttendanceAction,
                out var intendedEventType))
        {
            return BadRequest(new
            {
                errorCode = "INVALID_ATTENDANCE_ACTION",
                message = "The attendance action is not supported."
            });
        }

        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var challenge = await _dbContext.WebAuthnChallenges
            .SingleOrDefaultAsync(
                item =>
                    item.Id == request.ChallengeId &&
                    item.EmployeeId == employeeId.Value &&
                    item.CeremonyType ==
                        WebAuthnCeremonyType.Authentication,
                cancellationToken);

        var challengeError = ValidateChallenge(challenge);
        if (challengeError is not null)
        {
            return challengeError;
        }

        if (challenge!.IntendedEventType != intendedEventType)
        {
            return Conflict(new
            {
                errorCode = "WEBAUTHN_ACTION_MISMATCH",
                message = "The device-verification challenge was issued for a different attendance action."
            });
        }

        var credentialId = WebEncoders.Base64UrlEncode(
            request.Credential.RawId);

        var storedCredential =
            await _dbContext.WebAuthnCredentials
                .SingleOrDefaultAsync(
                    item =>
                        item.CredentialId == credentialId &&
                        item.EmployeeId == employeeId.Value &&
                        item.IsActive,
                    cancellationToken);

        if (storedCredential is null)
        {
            return Unauthorized(new
            {
                errorCode = "WEBAUTHN_CREDENTIAL_UNKNOWN",
                message = "This device credential is not registered for the employee."
            });
        }

        if (storedCredential.SignCount > uint.MaxValue)
        {
            return Conflict(new
            {
                errorCode = "WEBAUTHN_COUNTER_INVALID",
                message = "The registered device credential counter is invalid. Re-register the device."
            });
        }

        var originalOptions = AssertionOptions.FromJson(
            challenge.OptionsJson);

        try
        {
            IsUserHandleOwnerOfCredentialIdAsync callback =
                (args, _) =>
                {
                    var ownsCredential =
                        WebEncoders.Base64UrlEncode(
                            args.CredentialId) ==
                        storedCredential.CredentialId;

                    var userHandleMatches =
                        args.UserHandle is null ||
                        args.UserHandle.Length == 0 ||
                        args.UserHandle.SequenceEqual(
                            storedCredential.UserHandle);

                    return Task.FromResult(
                        ownsCredential && userHandleMatches);
                };

            var result = await _fido2.MakeAssertionAsync(
                new MakeAssertionParams
                {
                    AssertionResponse = request.Credential,
                    OriginalOptions = originalOptions,
                    StoredPublicKey = storedCredential.PublicKey,
                    StoredSignatureCounter =
                        checked((uint)storedCredential.SignCount),
                    IsUserHandleOwnerOfCredentialIdCallback = callback
                },
                cancellationToken: cancellationToken);

            var now = DateTimeOffset.UtcNow;
            storedCredential.SignCount = result.SignCount;
            storedCredential.LastUsedAtUtc = now;
            challenge.UsedAtUtc = now;

            var previousActiveSessions =
                await _dbContext.BiometricVerificationSessions
                    .Where(session =>
                        session.EmployeeId == employeeId.Value &&
                        session.UsedAtUtc == null &&
                        session.ExpiresAtUtc > now)
                    .ToListAsync(cancellationToken);

            foreach (var previousSession in previousActiveSessions)
            {
                previousSession.ExpiresAtUtc = now;
            }

            var verificationToken =
                _verificationTokenService.GenerateToken();

            var session = new BiometricVerificationSession
            {
                EmployeeId = employeeId.Value,
                TokenHash =
                    _verificationTokenService.HashToken(
                        verificationToken),
                VerificationMethod =
                    VerificationMethod.DeviceAuthenticator,
                Confidence = 100m,
                IntendedEventType = intendedEventType,
                ExpiresAtUtc =
                    now.Add(VerificationTokenLifetime),
                CreatedAtUtc = now
            };

            var recognitionAttempt =
                new BiometricRecognitionAttempt
                {
                    EmployeeId = employeeId.Value,
                    Modality =
                        BiometricModality.DeviceAuthenticator,
                    ProviderName = "WebAuthn",
                    Outcome =
                        BiometricRecognitionOutcome.Succeeded,
                    Confidence = 1.0000m,
                    IpAddress = GetRequestIpAddress(),
                    AttemptedAtUtc = now
                };

            _dbContext.BiometricVerificationSessions.Add(session);
            _dbContext.BiometricRecognitionAttempts.Add(
                recognitionAttempt);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var employee = await _dbContext.Employees
                .AsNoTracking()
                .SingleAsync(
                    item => item.Id == employeeId.Value,
                    cancellationToken);

            return Ok(new BiometricVerificationResponse(
                session.Id,
                employee.Id,
                employee.EmployeeNumber,
                $"{employee.FirstName} {employee.LastName}",
                verificationToken,
                session.Confidence,
                session.ExpiresAtUtc,
                IsMock: false,
                "Identity verified by the device authenticator."));
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);

            _logger.LogWarning(
                exception,
                "WebAuthn authentication verification failed for employee {EmployeeId}.",
                employeeId.Value);

            return Unauthorized(new
            {
                errorCode = "WEBAUTHN_VERIFICATION_FAILED",
                message = "Device verification failed or was not completed."
            });
        }
    }

    private async Task ExpireOutstandingChallengesAsync(
        Guid employeeId,
        WebAuthnCeremonyType ceremonyType,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var challenges = await _dbContext.WebAuthnChallenges
            .Where(item =>
                item.EmployeeId == employeeId &&
                item.CeremonyType == ceremonyType &&
                item.UsedAtUtc == null &&
                item.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var challenge in challenges)
        {
            challenge.ExpiresAtUtc = now;
        }
    }

    private ActionResult? ValidateChallenge(
        WebAuthnChallenge? challenge)
    {
        if (challenge is null)
        {
            return NotFound(new
            {
                errorCode = "WEBAUTHN_CHALLENGE_NOT_FOUND",
                message = "The device-verification challenge was not found. Start again."
            });
        }

        if (challenge.UsedAtUtc is not null)
        {
            return Conflict(new
            {
                errorCode = "WEBAUTHN_CHALLENGE_USED",
                message = "The device-verification challenge has already been used."
            });
        }

        if (challenge.ExpiresAtUtc <= DateTimeOffset.UtcNow)
        {
            return Unauthorized(new
            {
                errorCode = "WEBAUTHN_CHALLENGE_EXPIRED",
                message = "The device-verification challenge has expired. Start again."
            });
        }

        return null;
    }

    private static PublicKeyCredentialDescriptor ToDescriptor(
        string credentialId)
    {
        return new PublicKeyCredentialDescriptor(
            WebEncoders.Base64UrlDecode(credentialId));
    }

    private static string NormalizeDeviceName(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized)
            ? "Personal device"
            : normalized[..Math.Min(normalized.Length, 120)];
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
            User.FindFirstValue("employee_id");

        return Guid.TryParse(
            employeeIdValue,
            out var employeeId)
                ? employeeId
                : null;
    }

    private ObjectResult EmployeeAccountNotLinked()
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            new
            {
                errorCode = "EMPLOYEE_ACCOUNT_NOT_LINKED",
                message = "The authenticated account is not linked to an employee record."
            });
    }

    private string? GetRequestIpAddress()
    {
        var remoteIpAddress =
            HttpContext.Connection.RemoteIpAddress;

        if (remoteIpAddress?.IsIPv4MappedToIPv6 == true)
        {
            remoteIpAddress = remoteIpAddress.MapToIPv4();
        }

        return remoteIpAddress?.ToString();
    }
}

public sealed record BeginWebAuthnRegistrationRequest(
    string? DeviceName);

public sealed record CompleteWebAuthnRegistrationRequest(
    Guid ChallengeId,
    string? DeviceName,
    AuthenticatorAttestationRawResponse Credential);

public sealed record BeginWebAuthnAuthenticationRequest(
    string AttendanceAction);

public sealed record CompleteWebAuthnAuthenticationRequest(
    Guid ChallengeId,
    string AttendanceAction,
    AuthenticatorAssertionRawResponse Credential);

public sealed record WebAuthnOptionsResponse(
    Guid ChallengeId,
    object PublicKey);

public sealed record WebAuthnCredentialResponse(
    Guid Id,
    string DeviceName,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastUsedAtUtc);
