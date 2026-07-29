using ClockingManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Infrastructure.Biometrics;
using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Infrastructure.LocationSecurity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString =
    builder.Configuration.GetConnectionString(
        "DefaultConnection")
    ?? throw new InvalidOperationException(
        "The PostgreSQL connection string is missing.");

builder.Services.AddDbContext<ApplicationDbContext>(
    options =>
    {
        options.UseNpgsql(connectionString);
    });

builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(
        name: "postgresql-database");

builder.Services.AddScoped<
    IBiometricVerificationService,
    MockBiometricVerificationService>();

builder.Services.AddSingleton<
    IVerificationTokenService,
    VerificationTokenService>();

builder.Services.AddSingleton<
    IIpNetworkService,
    IpNetworkService>();

builder.Services.AddScoped<
    IClockingLocationValidator,
    ClockingLocationValidator>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks(
    "/health/live",
    new HealthCheckOptions
    {
        Predicate = _ => false
    });

app.MapHealthChecks("/health/ready");

app.Run();
