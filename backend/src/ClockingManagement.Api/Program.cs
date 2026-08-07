using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
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
using Fido2NetLib;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides;
using ClockingManagement.Api.Authentication;
using Microsoft.OpenApi.Models;
using ClockingManagement.Application.Payroll;
using ClockingManagement.Infrastructure.Payroll;

var builder =
    WebApplication.CreateBuilder(args);

var platformPort =
    Environment.GetEnvironmentVariable("PORT");

if (int.TryParse(platformPort, out var port))
{
    builder.WebHost.UseUrls(
        $"http://0.0.0.0:{port}");
}

static string GetRateLimitPartitionKey(
    HttpContext context)
{
    var remoteIpAddress =
        context.Connection.RemoteIpAddress;

    if (remoteIpAddress?.IsIPv4MappedToIPv6 == true)
    {
        remoteIpAddress =
            remoteIpAddress.MapToIPv4();
    }

    return remoteIpAddress?.ToString() ??
        "unknown-client";
}

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(
    options =>
    {
        options.AddSecurityDefinition(
            "Bearer",
            new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Description =
                    "Enter the JWT access token.",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT"
            });

        options.AddSecurityRequirement(
            new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference =
                            new OpenApiReference
                            {
                                Type =
                                    ReferenceType
                                        .SecurityScheme,
                                Id = "Bearer"
                            }
                    },
                    Array.Empty<string>()
                }
            });
        
        
    });

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

            options.Events =
                new JwtBearerEvents
                {
                    OnTokenValidated =
                        async context =>
                        {
                            var userIdValue =
                                context.Principal?
                                    .FindFirst(
                                        ClaimTypes
                                            .NameIdentifier)?
                                    .Value;

                            if (!Guid.TryParse(
                                    userIdValue,
                                    out var userId))
                            {
                                context.Fail(
                                    "The access token does not contain a valid user ID.");

                                return;
                            }

                            var userManager =
                                context.HttpContext
                                    .RequestServices
                                    .GetRequiredService<
                                        UserManager<
                                            ApplicationUser>>();

                            var user =
                                await userManager
                                    .FindByIdAsync(
                                        userId.ToString());

                            if (user is null ||
                                !user.IsActive)
                            {
                                context.Fail(
                                    "The user account is disabled or no longer exists.");
                            }
                        }
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

        options.AddPolicy(
            AuthorizationPolicies
                .ManageUserAccounts,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.HROfficer,
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies
                .ManageUserRoles,
            policy =>
                policy.RequireRole(
                    ApplicationRoles
                        .SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ViewEmployees,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles.SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ViewWorkLocations,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles.SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ViewAttendanceHistory,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles.PayrollOfficer,
                    ApplicationRoles.SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ViewAttendanceDashboard,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.Supervisor,
                    ApplicationRoles.HROfficer,
                    ApplicationRoles.PayrollOfficer,
                    ApplicationRoles.ExecutiveViewer,
                    ApplicationRoles.SystemAdministrator));



        options.AddPolicy(
    AuthorizationPolicies.ViewPayroll,
    policy =>
        policy.RequireRole(
            ApplicationRoles.HROfficer,
            ApplicationRoles.PayrollOfficer,
            ApplicationRoles.ExecutiveViewer,
            ApplicationRoles.SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ManagePayroll,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.PayrollOfficer,
                    ApplicationRoles.SystemAdministrator));

        options.AddPolicy(
            AuthorizationPolicies.ApprovePayroll,
            policy =>
                policy.RequireRole(
                    ApplicationRoles.PayrollOfficer,
                    ApplicationRoles.SystemAdministrator));
            });

builder.Services.AddRateLimiter(
    options =>
    {
        options.RejectionStatusCode =
            StatusCodes.Status429TooManyRequests;

        options.AddPolicy(
            "Login",
            context =>
                RateLimitPartition
                    .GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(
                            context),
                        _ =>
                            new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = 5,
                                Window =
                                    TimeSpan.FromMinutes(1),
                                QueueLimit = 0,
                                AutoReplenishment = true
                            }));

        options.AddPolicy(
            "BiometricVerification",
            context =>
                RateLimitPartition
                    .GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(
                            context),
                        _ =>
                            new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = 10,
                                Window =
                                    TimeSpan.FromMinutes(1),
                                QueueLimit = 0,
                                AutoReplenishment = true
                            }));

        options.AddPolicy(
            "Attendance",
            context =>
                RateLimitPartition
                    .GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(
                            context),
                        _ =>
                            new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = 10,
                                Window =
                                    TimeSpan.FromMinutes(1),
                                QueueLimit = 0,
                                AutoReplenishment = true
                            }));
    });

builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(
        name: "postgresql-database");

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

builder.Services.AddSingleton<
    IAuthenticationTokenService,
    JwtAuthenticationTokenService>();

builder.Services.AddScoped<
    IPayrollService,
    PayrollService>();

var allowedFrontendOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?.Where(origin =>
            !string.IsNullOrWhiteSpace(origin))
        .Select(origin =>
            origin.Trim().TrimEnd('/'))
        .Distinct(
            StringComparer.OrdinalIgnoreCase)
        .ToArray()
    ?? Array.Empty<string>();

if (
    builder.Environment.IsDevelopment() &&
    allowedFrontendOrigins.Length == 0)
{
    allowedFrontendOrigins =
    [
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ];
}

if (
    !builder.Environment.IsDevelopment() &&
    allowedFrontendOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "At least one production frontend origin must be configured in Cors:AllowedOrigins.");
}

var webAuthnRpId =
    builder.Configuration["WebAuthn:RpId"]?.Trim();

if (
    builder.Environment.IsDevelopment() &&
    string.IsNullOrWhiteSpace(webAuthnRpId))
{
    webAuthnRpId = "localhost";
}

if (string.IsNullOrWhiteSpace(webAuthnRpId))
{
    throw new InvalidOperationException(
        "WebAuthn:RpId must be configured for device biometric verification.");
}

var webAuthnOrigins =
    builder.Configuration
        .GetSection("WebAuthn:AllowedOrigins")
        .Get<string[]>()
        ?.Where(origin =>
            !string.IsNullOrWhiteSpace(origin))
        .Select(origin =>
            origin.Trim().TrimEnd('/'))
        .Distinct(StringComparer.Ordinal)
        .ToArray()
    ?? Array.Empty<string>();

if (
    builder.Environment.IsDevelopment() &&
    webAuthnOrigins.Length == 0)
{
    webAuthnOrigins =
    [
        "http://localhost:5173"
    ];
}

if (webAuthnOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "At least one WebAuthn origin must be configured in WebAuthn:AllowedOrigins.");
}

builder.Services.AddFido2(
    options =>
    {
        options.ServerDomain = webAuthnRpId;
        options.ServerName =
            builder.Configuration["WebAuthn:RpName"]?.Trim()
            ?? "HR Attendance Management System";
        options.Origins =
            new HashSet<string>(
                webAuthnOrigins,
                StringComparer.Ordinal);
    });

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "FrontendClients",
            policy =>
            {
                policy
                    .WithOrigins(
                        allowedFrontendOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
    });

var app =
    builder.Build();

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}

await using (var migrationScope =
             app.Services.CreateAsyncScope())
{
    var dbContext =
        migrationScope.ServiceProvider
            .GetRequiredService<
                ApplicationDbContext>();

    await dbContext.Database
        .MigrateAsync();
}

await IdentityDataSeeder.SeedAsync(
    app.Services,
    app.Configuration,
    app.Environment);

var swaggerEnabled =
    app.Environment.IsDevelopment() ||
    app.Configuration.GetValue<bool>(
        "Swagger:Enabled");

if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Railway terminates TLS at its edge and forwards requests to this HTTP-only
// container. Redirect only during local development to avoid redirecting the
// platform readiness probe or creating a proxy redirect loop.
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("FrontendClients");
app.UseRateLimiter();

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