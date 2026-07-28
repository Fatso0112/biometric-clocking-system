namespace ClockingManagement.Application.Biometrics;

public interface IVerificationTokenService
{
    string GenerateToken();

    string HashToken(string token);
}