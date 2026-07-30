using Microsoft.EntityFrameworkCore;
using BiometricClocking.Api.Data;
using BiometricClocking.Api.Services;

var builder = WebApplication.CreateBuilder(args);


// Controllers
builder.Services.AddControllers();


// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// PostgreSQL Database Connection
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));


// Register Services
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<AttendanceService>();


var app = builder.Build();


// Swagger UI
app.UseSwagger();
app.UseSwaggerUI();


app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();


app.Run();