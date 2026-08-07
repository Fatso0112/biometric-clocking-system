using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.Payroll;
using ClockingManagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/payroll")]
[Authorize]
public sealed class PayrollController
    : ControllerBase
{
    private readonly IPayrollService
        _payrollService;

    public PayrollController(
        IPayrollService payrollService)
    {
        _payrollService = payrollService;
    }

    [HttpPost("runs")]
    [Authorize(
        Policy =
            AuthorizationPolicies.ManagePayroll)]
    [ProducesResponseType(
        typeof(PayrollRunResult),
        StatusCodes.Status201Created)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PayrollRunResult>>
        CreatePayrollRun(
            [FromBody]
            CreatePayrollRunRequest request,
            CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "PAYROLL_USER_NOT_RESOLVED",
                    message =
                        "The authenticated user ID could not be resolved."
                });
        }

        try
        {
            var result =
                await _payrollService
                    .CreatePayrollRunAsync(
                        new CreatePayrollRunCommand(
                            PeriodStart:
                                request.PeriodStart,
                            PeriodEnd:
                                request.PeriodEnd,
                            CreatedByUserId:
                                currentUserId.Value,
                            Notes: request.Notes),
                        cancellationToken);

            return CreatedAtAction(
                nameof(GetPayrollRunById),
                new { id = result.Id },
                result);
        }
        catch (PayrollValidationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpGet("runs")]
    [Authorize(
        Policy =
            AuthorizationPolicies.ViewPayroll)]
    [ProducesResponseType(
        typeof(PagedPayrollRunsResult),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        PagedPayrollRunsResult>> GetPayrollRuns(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        PayrollRunStatus? parsedStatus = null;

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<PayrollRunStatus>(
                    status.Trim(),
                    ignoreCase: true,
                    out var statusValue) ||
                !Enum.IsDefined(
                    typeof(PayrollRunStatus),
                    statusValue))
            {
                return BadRequest(new
                {
                    errorCode =
                        "INVALID_PAYROLL_STATUS",
                    message =
                        $"'{status}' is not a supported payroll status.",
                    supportedStatuses =
                        Enum.GetNames<
                            PayrollRunStatus>()
                });
            }

            parsedStatus = statusValue;
        }

        try
        {
            var result =
                await _payrollService
                    .GetPayrollRunsAsync(
                        new PayrollRunQuery(
                            PeriodFrom: from,
                            PeriodTo: to,
                            Status: parsedStatus,
                            Page: page,
                            PageSize: pageSize),
                        cancellationToken);

            return Ok(result);
        }
        catch (PayrollValidationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpGet("runs/{id:guid}")]
    [Authorize(
        Policy =
            AuthorizationPolicies.ViewPayroll)]
    [ProducesResponseType(
        typeof(PayrollRunResult),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PayrollRunResult>>
        GetPayrollRunById(
            Guid id,
            CancellationToken cancellationToken)
    {
        var result =
            await _payrollService
                .GetPayrollRunAsync(
                    id,
                    cancellationToken);

        if (result is null)
        {
            return NotFound(new
            {
                errorCode =
                    "PAYROLL_RUN_NOT_FOUND",
                message =
                    "The selected payroll run was not found."
            });
        }

        return Ok(result);
    }

    [HttpPost("runs/{id:guid}/approve")]
    [Authorize(
        Policy =
            AuthorizationPolicies.ApprovePayroll)]
    [ProducesResponseType(
        typeof(PayrollRunResult),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PayrollRunResult>>
        ApprovePayrollRun(
            Guid id,
            CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    errorCode =
                        "PAYROLL_USER_NOT_RESOLVED",
                    message =
                        "The authenticated user ID could not be resolved."
                });
        }

        try
        {
            var result =
                await _payrollService
                    .ApprovePayrollRunAsync(
                        id,
                        currentUserId.Value,
                        cancellationToken);

            return Ok(result);
        }
        catch (PayrollValidationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpGet("employee/{id:guid}/summary")]
    [Authorize(
        Policy =
            AuthorizationPolicies.ViewPayroll)]
    [ProducesResponseType(
        typeof(EmployeePayrollSummaryResult),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<
        EmployeePayrollSummaryResult>>
        GetEmployeePayrollSummary(
            Guid id,
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] bool approvedOnly = false,
            CancellationToken cancellationToken = default)
    {
        try
        {
            var result =
                await _payrollService
                    .GetEmployeePayrollSummaryAsync(
                        id,
                        from,
                        to,
                        approvedOnly,
                        cancellationToken);

            return Ok(result);
        }
        catch (PayrollValidationException exception)
        {
            return ToErrorResult(exception);
        }
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

    private ActionResult ToErrorResult(
        PayrollValidationException exception)
    {
        var response = new
        {
            errorCode = exception.ErrorCode,
            message = exception.Message
        };

        return exception.ErrorCode switch
        {
            "PAYROLL_RUN_NOT_FOUND" or
            "EMPLOYEE_NOT_FOUND" =>
                NotFound(response),

            "PAYROLL_PERIOD_OVERLAP" or
            "NO_ACTIVE_EMPLOYEES" or
            "PAYROLL_RUN_ALREADY_APPROVED" or
            "PAYROLL_RUN_CANCELLED" or
            "PAYROLL_RUN_HAS_EXCEPTIONS" =>
                Conflict(response),

            _ => BadRequest(response)
        };
    }
}
