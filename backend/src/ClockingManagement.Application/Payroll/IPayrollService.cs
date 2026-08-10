namespace ClockingManagement.Application.Payroll;

public interface IPayrollService
{
    Task<PayrollCalculationResult> CalculateAsync(
        PayrollCalculationRequest request,
        CancellationToken cancellationToken = default);
}