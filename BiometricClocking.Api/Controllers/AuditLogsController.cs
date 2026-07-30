using Microsoft.AspNetCore.Mvc;

namespace BiometricClocking.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditLogsController : ControllerBase
    {
        // GET: api/auditlogs
        [HttpGet]
        public IActionResult GetAuditLogs()
        {
            return Ok("Get audit logs endpoint working");
        }


        // GET: api/auditlogs/{id}
        [HttpGet("{id}")]
        public IActionResult GetAuditLog(int id)
        {
            return Ok($"Get audit log with ID {id}");
        }


        // POST: api/auditlogs
        [HttpPost]
        public IActionResult CreateAuditLog()
        {
            return Ok("Audit log created successfully");
        }


        // DELETE: api/auditlogs/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteAuditLog(int id)
        {
            return Ok($"Audit log {id} deleted");
        }
    }
}