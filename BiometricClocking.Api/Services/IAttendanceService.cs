using BiometricClocking.Api.Models;

namespace BiometricClocking.Api.Services;

public interface IAttendanceService
{
    Task<IEnumerable<Attendance>> GetAllAsync();

    Task<Attendance> CreateAsync(Attendance attendance);
}