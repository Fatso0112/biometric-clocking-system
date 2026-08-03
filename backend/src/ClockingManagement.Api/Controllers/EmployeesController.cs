using System.Security.Claims;
using ClockingManagement.Application.Authorization;
using Microsoft.AspNetCore.Authorization;
using ClockingManagement.Application.Employees;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/employees")]
[Authorize]
public sealed class EmployeesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public EmployeesController(
        ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ViewEmployees)]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<EmployeeResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        IReadOnlyCollection<EmployeeResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var employees = await _dbContext.Employees
            .AsNoTracking()
            .OrderBy(employee => employee.FirstName)
            .ThenBy(employee => employee.LastName)
            .Select(employee => new EmployeeResponse(
                employee.Id,
                employee.EmployeeNumber,
                employee.FirstName,
                employee.LastName,
                employee.FirstName + " " +
                    employee.LastName,
                employee.Email,
                employee.PhoneNumber,
                employee.DepartmentId,
                employee.Department.Name,
                employee.WorkLocationId,
                employee.WorkLocation.Name,
                employee.IsActive,
                employee.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(employees);
    }

    [HttpGet("me")]
    [ProducesResponseType(
        typeof(EmployeeResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmployeeResponse>> GetMe(
        CancellationToken cancellationToken)
    {
        var employeeIdValue =
            User.FindFirstValue("employee_id");

        if (!Guid.TryParse(
                employeeIdValue,
                out var employeeId))
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

        var employee = await _dbContext.Employees
            .AsNoTracking()
            .Where(item =>
                item.Id == employeeId)
            .Select(item => new EmployeeResponse(
                item.Id,
                item.EmployeeNumber,
                item.FirstName,
                item.LastName,
                item.FirstName + " " + item.LastName,
                item.Email,
                item.PhoneNumber,
                item.DepartmentId,
                item.Department.Name,
                item.WorkLocationId,
                item.WorkLocation.Name,
                item.IsActive,
                item.CreatedAtUtc))
            .SingleOrDefaultAsync(
                cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                errorCode =
                    "EMPLOYEE_NOT_FOUND",
                message =
                    "The linked employee record was not found."
            });
        }

        return Ok(employee);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ViewEmployees)]
    [ProducesResponseType(
        typeof(EmployeeResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmployeeResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var employee = await _dbContext.Employees
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new EmployeeResponse(
                item.Id,
                item.EmployeeNumber,
                item.FirstName,
                item.LastName,
                item.FirstName + " " + item.LastName,
                item.Email,
                item.PhoneNumber,
                item.DepartmentId,
                item.Department.Name,
                item.WorkLocationId,
                item.WorkLocation.Name,
                item.IsActive,
                item.CreatedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message = "Employee was not found."
            });
        }

        return Ok(employee);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManageEmployees)]
    [ProducesResponseType(
        typeof(EmployeeResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EmployeeResponse>> Create(
        [FromBody] CreateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        var employeeNumber =
            request.EmployeeNumber.Trim();

        var employeeNumberExists =
            await _dbContext.Employees.AnyAsync(
                employee =>
                    EF.Functions.ILike(
                        employee.EmployeeNumber,
                        employeeNumber),
                cancellationToken);

        if (employeeNumberExists)
        {
            return Conflict(new
            {
                message =
                    "An employee with this employee number " +
                    "already exists."
            });
        }

        var email = string.IsNullOrWhiteSpace(
            request.Email)
            ? null
            : request.Email.Trim().ToLowerInvariant();

        if (email is not null)
        {
            var emailExists =
                await _dbContext.Employees.AnyAsync(
                    employee =>
                        employee.Email != null &&
                        EF.Functions.ILike(
                            employee.Email,
                            email),
                    cancellationToken);

            if (emailExists)
            {
                return Conflict(new
                {
                    message =
                        "An employee with this email address " +
                        "already exists."
                });
            }
        }

        var department =
            await _dbContext.Departments
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == request.DepartmentId &&
                        item.IsActive,
                    cancellationToken);

        if (department is null)
        {
            return BadRequest(new
            {
                message =
                    "The selected department does not exist " +
                    "or is inactive."
            });
        }

        var workLocation =
            await _dbContext.WorkLocations
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    item =>
                        item.Id == request.WorkLocationId &&
                        item.IsActive,
                    cancellationToken);

        if (workLocation is null)
        {
            return BadRequest(new
            {
                message =
                    "The selected work location does not exist " +
                    "or is inactive."
            });
        }

        var employee = new Employee
        {
            EmployeeNumber = employeeNumber,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(
                request.PhoneNumber)
                ? null
                : request.PhoneNumber.Trim(),
            DepartmentId = department.Id,
            WorkLocationId = workLocation.Id
        };

        _dbContext.Employees.Add(employee);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response = new EmployeeResponse(
            employee.Id,
            employee.EmployeeNumber,
            employee.FirstName,
            employee.LastName,
            employee.FirstName + " " +
                employee.LastName,
            employee.Email,
            employee.PhoneNumber,
            employee.DepartmentId,
            department.Name,
            employee.WorkLocationId,
            workLocation.Name,
            employee.IsActive,
            employee.CreatedAtUtc);

        return CreatedAtAction(
            nameof(GetById),
            new { id = employee.Id },
            response);
    }

    [HttpGet("by-number/{employeeNumber}")]
    [Authorize(Policy = AuthorizationPolicies.ViewEmployees)]
    public async Task<ActionResult<EmployeeLookupResponse>>
        GetByEmployeeNumber(
            string employeeNumber,
            CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(employeeNumber))
        {
            return BadRequest(new
            {
                message =
                    "An employee number is required."
            });
        }

        var normalizedEmployeeNumber =
            employeeNumber.Trim();

        if (normalizedEmployeeNumber.Length > 50)
        {
            return BadRequest(new
            {
                message =
                    "The employee number is too long."
            });
        }

        var employee =
            await _dbContext.Employees
                .AsNoTracking()
                .Include(item => item.Department)
                .Include(item => item.WorkLocation)
                .SingleOrDefaultAsync(
                    item =>
                        EF.Functions.ILike(
                            item.EmployeeNumber,
                            normalizedEmployeeNumber),
                    cancellationToken);

        if (employee is null)
        {
            return NotFound(new
            {
                message =
                    $"No employee was found with employee number '{normalizedEmployeeNumber}'."
            });
        }

        var response =
            new EmployeeLookupResponse(
                employee.Id,
                employee.EmployeeNumber,
                employee.FirstName,
                employee.LastName,
                $"{employee.FirstName} {employee.LastName}",
                employee.DepartmentId,
                employee.Department.Name,
                employee.WorkLocationId,
                employee.WorkLocation.Name,
                employee.IsActive);

        return Ok(response);
    }
}