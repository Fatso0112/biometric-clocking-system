using Microsoft.AspNetCore.Mvc;

namespace BiometricClocking.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeesController : ControllerBase
    {
        // GET: api/employees
        [HttpGet]
        public IActionResult GetEmployees()
        {
            return Ok("Get all employees endpoint working");
        }


        // GET: api/employees/{id}
        [HttpGet("{id}")]
        public IActionResult GetEmployee(int id)
        {
            return Ok($"Get employee with ID {id}");
        }


        // POST: api/employees
        [HttpPost]
        public IActionResult CreateEmployee()
        {
            return Ok("Employee created successfully");
        }


        // PUT: api/employees/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateEmployee(int id)
        {
            return Ok($"Employee with ID {id} updated successfully");
        }


        // DELETE: api/employees/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteEmployee(int id)
        {
            return Ok($"Employee with ID {id} deleted successfully");
        }
    }
}