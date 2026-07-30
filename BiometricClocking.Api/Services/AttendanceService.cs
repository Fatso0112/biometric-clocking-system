using BiometricClocking.Api.Data;
using BiometricClocking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BiometricClocking.Api.Services;

public class AttendanceService : IAttendanceService
{
    private readonly AppDbContext _context;


    public AttendanceService(AppDbContext context)
    {
        _context = context;
    }



    public async Task<IEnumerable<Attendance>> GetAllAsync()
    {
        return await _context.Attendances
            .Include(a => a.Employee)
            .ToListAsync();
    }



    public async Task<Attendance> CreateAsync(
        Attendance attendance)
    {
        attendance.CheckInTime = DateTime.UtcNow;


        _context.Attendances.Add(attendance);


        await _context.SaveChangesAsync();


        return attendance;
    }
}