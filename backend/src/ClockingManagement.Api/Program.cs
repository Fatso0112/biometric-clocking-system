using System.Security.Claims;
using System.Text;
using ClockingManagement.Api.Identity;
using ClockingManagement.Application.Attendance;
using ClockingManagement.Application.Authentication;
using ClockingManagement.Application.Authorization;
using ClockingManagement.Application.Biometrics;
using ClockingManagement.Application.LocationSecurity;
using ClockingManagement.Application.WorkLocations;
using ClockingManagement.Infrastructure.Biometrics;
using ClockingManagement.Infrastructure.Identity;
using ClockingManagement.Infrastructure.LocationSecurity;
using ClockingManagement.Infrastructure.Persistence;
using ClockingManagement.Infrastructure.Time;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder =
    WebApplication.CreateBuilder(args);

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
    .AddIdentityCore<ApplicationUser>(
        options =>
        {
            options.User.RequireUniqueEmail = true;

            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password
                .RequireNonAlphanumeric = true;

            options.Lockout
                .AllowedForNewUsers = true;
            options.Lockout
                .MaxFailedAccessAttempts = 5;
            options.Lockout
                .DefaultLockoutTimeSpan =
                    TimeSpan.FromMinutes(15);

            options.SignIn
                .RequireConfirmedEmail = false;
        })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<
        ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services
    .AddOptions<JwtOptions>()
    .Bind(
        builder.Configuration.GetSection(
            JwtOptions.SectionName))
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.Issuer),
        "JWT issuer is required.")
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.Audience),
        "JWT audience is required.")
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.SigningKey) &&
            options.SigningKey.Length >= 32,
        "JWT signing key must contain at least 32 characters.")
    .Validate(
        options =>
            options.AccessTokenMinutes > 0,
        "JWT access-token lifetime must be positive.")
    .Validate(
        options =>
            options.RefreshTokenDays > 0,
        "Refresh-token lifetime must be positive.")
    .ValidateOnStart();

var jwtOptions =
    builder.Configuration
        .GetSection(
            JwtOptions.SectionName)
        .Get<JwtOptions>()
    ?? throw new InvalidOperationException(
        "JWT configuration is missing.");

var signingKey =
    new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(
            jwtOptions.SigningKey));

builder.Services
    .AddAuthentication(
        options =>
        {
            options.DefaultAuthenticateScheme =
                JwtBearerDefaults
                    .AuthenticationScheme;

            options.DefaultChallengeScheme =
                JwtBearerDefaults
                    .AuthenticationScheme;

            options.DefaultScheme =
                JwtBearerDefaults
                    .AuthenticationScheme;
        })
    .AddJwtBearer(
        options =>
        {
            options.SaveToken = true;

            options.TokenValidationParameters =
                new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer =
                        jwtOptions.Issuer,

                    ValidateAudience = true,
                    ValidAudience =
                        jwtOptions.Audience,

                    ValidateLifetime = true,

                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey =
                        signingKey,

                    ClockSkew =
                        TimeSpan.FromSeconds(30),

                    NameClaimType =
                        ClaimTypes.NameIdentifier,

                    RoleClaimType =
                        ClaimTypes.Role
                };
        });

builder.Services.AddAuthorization(
    options =>
    {
        options.AddPolicy(
            AuthorizationPolicies
                .ManageEmployees,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.HROfficer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ManageWorkLocations,
            policy =>
                policy.RequireRole(
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ManageBiometrics,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.HROfficer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ReviewAttendanceCorrections,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ViewTeamAttendance,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ViewOrganisationReports,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.HROfficer,
                    ApplicationRoles.PayrollOfficer,
                    ApplicationRoles.ExecutiveViewer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ManageSystemConfiguration,
            policy =>
                policy.RequireRole(
                    ApplicationRoles
                        .SystemAdministrator));
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

builder.Services.AddSingleton<
    IWorkdayTimeService,
    SystemWorkdayTimeService>();

builder.Services.AddSingleton<
    IAttendanceSessionCalculator,
    AttendanceSessionCalculator>();

var app =
    builder.Build();

await IdentityDataSeeder.SeedAsync(
    app.Services,
    app.Configuration,
    app.Environment);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks(
    "/health/live",
    new HealthCheckOptions
    {
        Predicate = _ => false
    });

app.MapHealthChecks(
    "/health/ready");

app.Run();