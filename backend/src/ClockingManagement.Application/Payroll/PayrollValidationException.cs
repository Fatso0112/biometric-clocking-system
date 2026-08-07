namespace ClockingManagement.Application.Payroll;

public sealed class PayrollValidationException
    : Exception
{
    public PayrollValidationException(
        string errorCode,
        string message)
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public string ErrorCode { get; }
}