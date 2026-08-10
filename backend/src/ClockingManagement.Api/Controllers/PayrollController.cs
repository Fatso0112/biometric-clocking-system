using ClockingManagement.Application.Payroll;
using Microsoft.AspNetCore.Mvc;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/payroll")]
public sealed class PayrollController : ControllerBase
{
    private readonly IPayrollService _payrollService;

    public PayrollController(IPayrollService payrollService)
    {
        _payrollService = payrollService;
    }

    [HttpGet("{employeeId:guid}")]
    public async Task<ActionResult<PayrollCalculationResult>> CalculatePayroll(
        Guid employeeId,
        [FromQuery] DateOnly periodStart,
        [FromQuery] DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        try
        {
            var request = new PayrollCalculationRequest(
                employeeId,
                periodStart,
                periodEnd);

            var result = await _payrollService.CalculateAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}