using BiometricClocking.Api.Data;
using BiometricClocking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BiometricClocking.Api.Services;

public class EmployeeService : IEmployeeService
{
    private readonly AppDbContext _context;


    public EmployeeService(AppDbContext context)
    {
        _context = context;
    }



    public async Task<IEnumerable<Employee>> GetAllAsync()
    {
        return await _context.Employees.ToListAsync();
    }



    public async Task<Employee?> GetByIdAsync(Guid id)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id);
    }



    public async Task<Employee> CreateAsync(Employee employee)
    {
        _context.Employees.Add(employee);

        await _context.SaveChangesAsync();

        return employee;
    }



    public async Task DeleteAsync(Guid id)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id);


        if(employee != null)
        {
            _context.Employees.Remove(employee);

            await _context.SaveChangesAsync();
        }
    }
}