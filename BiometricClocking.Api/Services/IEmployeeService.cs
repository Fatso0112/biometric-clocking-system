using BiometricClocking.Api.Models;

namespace BiometricClocking.Api.Services;

public interface IEmployeeService
{
    Task<IEnumerable<Employee>> GetAllAsync();

    Task<Employee?> GetByIdAsync(Guid id);

    Task<Employee> CreateAsync(Employee employee);

    Task DeleteAsync(Guid id);
}