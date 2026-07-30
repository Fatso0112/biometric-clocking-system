using BiometricClocking.Realtime.Data;
using BiometricClocking.Realtime.Hubs;
using BiometricClocking.Realtime.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


// ======================================
// Database Configuration
// PostgreSQL + Entity Framework Core
// ======================================

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);


// ======================================
// Register Application Services
// ======================================

builder.Services.AddScoped<IAuditService, AuditService>();


// ======================================
// SignalR Configuration
// ======================================

builder.Services.AddSignalR();


// ======================================
// Controllers / Swagger
// ======================================

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();


// ======================================
// CORS
// Allows API / Frontend communication
// ======================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(_ => true);
    });
});


var app = builder.Build();


// ======================================
// Middleware
// ======================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI();
}


app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthorization();


// ======================================
// Map Controllers
// ======================================

app.MapControllers();


// ======================================
// SignalR Hub Endpoint
// ======================================

app.MapHub<AttendanceHub>("/attendanceHub");


// ======================================
// Run Application
// ======================================

app.Run();