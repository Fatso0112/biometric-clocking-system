using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using Microsoft.AspNetCore.Authorization;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Domain.Enums;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
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

    private readonly ApplicationDbContext _dbContext;
    private readonly IBiometricVerificationService
        _biometricVerificationService;
    private readonly IVerificationTokenService
        _verificationTokenService;

    public BiometricVerificationsController(
        ApplicationDbContext dbContext,
        IBiometricVerificationService
            biometricVerificationService,
        IVerificationTokenService
            verificationTokenService)
    {
        _dbContext = dbContext;
        _biometricVerificationService =
            biometricVerificationService;
        _verificationTokenService =
            verificationTokenService;
    }

    [HttpPost("mock")]
    [ProducesResponseType(
        typeof(BiometricVerificationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<
        ActionResult<BiometricVerificationResponse>> VerifyMockFace(
        [FromBody] MockBiometricVerificationRequest request,
        CancellationToken cancellationToken)
    {
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

        var employeeNumber =
            request.EmployeeNumber.Trim();

        var employee = await _dbContext.Employees
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
                message = "Employee was not found."
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
                message =
                    "The employee account is inactive."
            });
        }

        var verificationResult =
            await _biometricVerificationService.VerifyAsync(
                employee.Id,
                cancellationToken);

        if (!verificationResult.IsVerified)
        {
            return Unauthorized(new
            {
                message = verificationResult.Message
            });
        }

        var now = DateTimeOffset.UtcNow;

        var previousActiveSessions =
            await _dbContext
                .BiometricVerificationSessions
                .Where(session =>
                    session.EmployeeId == employee.Id &&
                    session.UsedAtUtc == null &&
                    session.ExpiresAtUtc > now)
                .ToListAsync(cancellationToken);

        foreach (var previousSession
                 in previousActiveSessions)
        {
            previousSession.ExpiresAtUtc = now;
        }

        var verificationToken =
            _verificationTokenService.GenerateToken();

        var tokenHash =
            _verificationTokenService.HashToken(
                verificationToken);

        var session =
            new BiometricVerificationSession
            {
                EmployeeId = employee.Id,
                TokenHash = tokenHash,
                VerificationMethod =
                    VerificationMethod.MockFace,
                Confidence =
                    verificationResult.Confidence,
                ExpiresAtUtc =
                    now.Add(TokenLifetime),
                CreatedAtUtc = now
            };

        _dbContext.BiometricVerificationSessions.Add(
            session);

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
                IsMock: true,
                verificationResult.Message);

        return Ok(response);
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
}
