using ClockingManagement.Application.Departments;
using ClockingManagement.Domain.Entities;
using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClockingManagement.Api.Controllers;

[ApiController]
[Route("api/v1/departments")]
public sealed class DepartmentsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public DepartmentsController(
        ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<DepartmentResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<
        IReadOnlyCollection<DepartmentResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var departments = await _dbContext.Departments
            .AsNoTracking()
            .OrderBy(department => department.Name)
            .Select(department => new DepartmentResponse(
                department.Id,
                department.Name,
                department.Description,
                department.IsActive,
                department.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(departments);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(DepartmentResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DepartmentResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var department = await _dbContext.Departments
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new DepartmentResponse(
                item.Id,
                item.Name,
                item.Description,
                item.IsActive,
                item.CreatedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);

        if (department is null)
        {
            return NotFound(new
            {
                message = "Department was not found."
            });
        }

        return Ok(department);
    }

    [HttpPost]
    [ProducesResponseType(
        typeof(DepartmentResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentResponse>> Create(
        [FromBody] CreateDepartmentRequest request,
        CancellationToken cancellationToken)
    {
        var departmentName = request.Name.Trim();

        var departmentExists =
            await _dbContext.Departments.AnyAsync(
                department =>
                    EF.Functions.ILike(
                        department.Name,
                        departmentName),
                cancellationToken);

        if (departmentExists)
        {
            return Conflict(new
            {
                message =
                    "A department with this name already exists."
            });
        }

        var department = new Department
        {
            Name = departmentName,
            Description = string.IsNullOrWhiteSpace(
                request.Description)
                ? null
                : request.Description.Trim()
        };

        _dbContext.Departments.Add(department);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var response = new DepartmentResponse(
            department.Id,
            department.Name,
            department.Description,
            department.IsActive,
            department.CreatedAtUtc);

        return CreatedAtAction(
            nameof(GetById),
            new { id = department.Id },
            response);
    }
}