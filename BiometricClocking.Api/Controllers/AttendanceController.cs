using Microsoft.AspNetCore.Mvc;

namespace BiometricClocking.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        // GET: api/attendance
        [HttpGet]
        public IActionResult GetAttendance()
        {
            return Ok("Get attendance records endpoint working");
        }


        // GET: api/attendance/{id}
        [HttpGet("{id}")]
        public IActionResult GetAttendanceById(int id)
        {
            return Ok($"Get attendance record with ID {id}");
        }


        // POST: api/attendance
        [HttpPost]
        public IActionResult ClockIn()
        {
            return Ok("Attendance recorded successfully");
        }


        // PUT: api/attendance/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateAttendance(int id)
        {
            return Ok($"Attendance record {id} updated");
        }


        // DELETE: api/attendance/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteAttendance(int id)
        {
            return Ok($"Attendance record {id} deleted");
        }
    }
}