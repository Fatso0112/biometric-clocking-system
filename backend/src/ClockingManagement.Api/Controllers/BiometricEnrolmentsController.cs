using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/biometric-enrolments")]
[Authorize]
public sealed class BiometricEnrolmentsController
    : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IBiometricEnrolmentService _enrolmentService;

    public BiometricEnrolmentsController(
        ApplicationDbContext dbContext,
        IBiometricEnrolmentService enrolmentService)
    {
        _dbContext = dbContext;
        _enrolmentService = enrolmentService;
    }

    [HttpPost("mock")]
    [Authorize(Policy = AuthorizationPolicies.ManageBiometrics)]
    public async Task<ActionResult<BiometricEnrolmentResponse>> CreateMock(
        [FromBody] CreateMockBiometricEnrolmentRequest request,
        CancellationToken cancellationToken)
    {
        if (request.EmployeeId == Guid.Empty)
        {
            return BadRequest(new
            {
                errorCode = "EMPLOYEE_ID_REQUIRED",
                message = "A valid employee ID is required."
            });
        }

        if (!TryParseModality(request.Modality, out var modality))
        {
            return BadRequest(new
            {
                errorCode = "INVALID_BIOMETRIC_MODALITY",
                message = "The modality must be Face or Fingerprint."
            });
        }

        var currentUserId = GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return Unauthorized(new
            {
                errorCode = "AUTHENTICATED_USER_NOT_FOUND",
                message = "The authenticated user ID could not be determined."
            });
        }

        var result =
            await _enrolmentService.EnrolAsync(
                request.EmployeeId,
                modality,
                request.Label,
                currentUserId.Value,
                cancellationToken);

        if (!result.Succeeded || result.Enrolment is null)
        {
            return result.ErrorCode switch
            {
                "EMPLOYEE_NOT_FOUND" =>
                    NotFound(CreateError(result)),

                "ACTIVE_FACE_ENROLMENT_EXISTS" =>
                    Conflict(CreateError(result)),

                "EMPLOYEE_INACTIVE" or
                "BIOMETRIC_PROFILE_DISABLED" =>
                    Conflict(CreateError(result)),

                _ =>
                    BadRequest(CreateError(result))
            };
        }

        return StatusCode(
            StatusCodes.Status201Created,
            ToResponse(result.Enrolment));
    }

    [HttpGet("~/api/v1/employees/{employeeId:guid}/biometric-profile")]
    public async Task<ActionResult<BiometricProfileResponse>> GetProfile(
        Guid employeeId,
        CancellationToken cancellationToken)
    {
        if (!CanAccessEmployee(employeeId))
        {
            return Forbid();
        }

        var profile =
            await _dbContext.BiometricProfiles
                .AsNoTracking()
                .Include(item => item.Employee)
                .Include(item => item.Enrolments)
                .SingleOrDefaultAsync(
                    item => item.EmployeeId == employeeId,
                    cancellationToken);

        if (profile is null)
        {
            return NotFound(new
            {
                errorCode = "BIOMETRIC_PROFILE_NOT_FOUND",
                message = "The employee does not have a biometric profile."
            });
        }

        return Ok(ToProfileResponse(profile));
    }

    [HttpGet("~/api/v1/employees/{employeeId:guid}/biometric-enrolments")]
    public async Task<ActionResult<
        IReadOnlyCollection<BiometricEnrolmentResponse>>> GetEnrolments(
        Guid employeeId,
        CancellationToken cancellationToken)
    {
        if (!CanAccessEmployee(employeeId))
        {
            return Forbid();
        }

        var employeeExists =
            await _dbContext.Employees
                .AsNoTracking()
                .AnyAsync(
                    employee => employee.Id == employeeId,
                    cancellationToken);

        if (!employeeExists)
        {
            return NotFound(new
            {
                errorCode = "EMPLOYEE_NOT_FOUND",
                message = "The employee was not found."
            });
        }

        var enrolments =
            await _dbContext.BiometricEnrolments
                .AsNoTracking()
                .Where(item =>
                    item.BiometricProfile.EmployeeId == employeeId)
                .OrderByDescending(item => item.EnrolledAtUtc)
                .ToListAsync(cancellationToken);

        return Ok(
            enrolments
                .Select(ToResponse)
                .ToArray());
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.ManageBiometrics)]
    public async Task<ActionResult<BiometricEnrolmentResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateBiometricEnrolmentStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryParseEnrolmentStatus(request.Status, out var status))
        {
            return BadRequest(new
            {
                errorCode = "INVALID_ENROLMENT_STATUS",
                message = "The status must be Active, Disabled, or Revoked."
            });
        }

        var result =
            await _enrolmentService.ChangeStatusAsync(
                id,
                status,
                cancellationToken);

        if (!result.Succeeded || result.Enrolment is null)
        {
            return result.ErrorCode switch
            {
                "BIOMETRIC_ENROLMENT_NOT_FOUND" =>
                    NotFound(CreateError(result)),

                "REVOKED_ENROLMENT_CANNOT_BE_REACTIVATED" or
                "BIOMETRIC_PROFILE_DISABLED" =>
                    Conflict(CreateError(result)),

                _ =>
                    BadRequest(CreateError(result))
            };
        }

        return Ok(ToResponse(result.Enrolment));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManageBiometrics)]
    public async Task<IActionResult> Revoke(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result =
            await _enrolmentService.ChangeStatusAsync(
                id,
                BiometricEnrolmentStatus.Revoked,
                cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode ==
                "BIOMETRIC_ENROLMENT_NOT_FOUND"
                ? NotFound(CreateError(result))
                : Conflict(CreateError(result));
        }

        return NoContent();
    }

    [HttpPut(
        "~/api/v1/employees/{employeeId:guid}/biometric-profile/status")]
    [Authorize(Policy = AuthorizationPolicies.ManageBiometrics)]
    public async Task<ActionResult<BiometricProfileResponse>>
        UpdateProfileStatus(
            Guid employeeId,
            [FromBody] UpdateBiometricProfileStatusRequest request,
            CancellationToken cancellationToken)
    {
        var profile =
            await _dbContext.BiometricProfiles
                .Include(item => item.Employee)
                .Include(item => item.Enrolments)
                .SingleOrDefaultAsync(
                    item => item.EmployeeId == employeeId,
                    cancellationToken);

        if (profile is null)
        {
            return NotFound(new
            {
                errorCode = "BIOMETRIC_PROFILE_NOT_FOUND",
                message = "The employee does not have a biometric profile."
            });
        }

        profile.IsActive = request.IsActive;
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToProfileResponse(profile));
    }

    private bool CanAccessEmployee(Guid employeeId)
    {
        if (User.IsInRole(ApplicationRoles.HROfficer) ||
            User.IsInRole(ApplicationRoles.SystemAdministrator))
        {
            return true;
        }

        var employeeClaim =
            User.FindFirstValue("employee_id");

        return Guid.TryParse(
                   employeeClaim,
                   out var linkedEmployeeId) &&
               linkedEmployeeId == employeeId;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out var userId)
                ? userId
                : null;
    }

    private static bool TryParseModality(
        string value,
        out BiometricModality modality)
    {
        return Enum.TryParse(
                   value?.Trim(),
                   true,
                   out modality) &&
               Enum.IsDefined(modality);
    }

    private static bool TryParseEnrolmentStatus(
        string value,
        out BiometricEnrolmentStatus status)
    {
        return Enum.TryParse(
                   value?.Trim(),
                   true,
                   out status) &&
               Enum.IsDefined(status);
    }

    private static object CreateError(
        BiometricEnrolmentOperationResult result)
    {
        return new
        {
            errorCode = result.ErrorCode,
            message = result.Message
        };
    }

    private static BiometricProfileResponse ToProfileResponse(
        BiometricProfile profile)
    {
        var enrolments =
            profile.Enrolments
                .OrderByDescending(item => item.EnrolledAtUtc)
                .Select(ToResponse)
                .ToArray();

        return new BiometricProfileResponse(
            profile.Id,
            profile.EmployeeId,
            profile.Employee.EmployeeNumber,
            $"{profile.Employee.FirstName} {profile.Employee.LastName}",
            profile.IsActive,
            enrolments.Count(item =>
                item.Status ==
                BiometricEnrolmentStatus.Active.ToString()),
            profile.CreatedAtUtc,
            profile.UpdatedAtUtc,
            enrolments);
    }

    private static BiometricEnrolmentResponse ToResponse(
        BiometricEnrolment item)
    {
        return new BiometricEnrolmentResponse(
            item.Id,
            item.BiometricProfileId,
            item.Modality.ToString(),
            item.ProviderName,
            item.ExternalReference,
            item.Label,
            item.Status.ToString(),
            item.QualityScore,
            item.CreatedByUserId,
            item.EnrolledAtUtc,
            item.DisabledAtUtc,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }
}
