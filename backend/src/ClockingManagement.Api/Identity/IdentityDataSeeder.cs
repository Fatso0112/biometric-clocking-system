using ClockingManagement.Application.Authorization;
using ClockingManagement.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace ClockingManagement.Api.Identity;

public static class IdentityDataSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        using var scope =
            services.CreateScope();

        var roleManager =
            scope.ServiceProvider
                .GetRequiredService<
                    RoleManager<IdentityRole<Guid>>>();

        foreach (var roleName in
                 ApplicationRoles.All)
        {
            if (await roleManager.RoleExistsAsync(
                    roleName))
            {
                continue;
            }

            var roleResult =
                await roleManager.CreateAsync(
                    new IdentityRole<Guid>
                    {
                        Id = Guid.NewGuid(),
                        Name = roleName
                    });

            EnsureSucceeded(
                roleResult,
                $"creating role '{roleName}'");
        }

        var administratorSeedingEnabled =
            environment.IsDevelopment() ||
            configuration.GetValue<bool>(
                "SeedAdmin:Enabled");

        if (!administratorSeedingEnabled)
        {
            return;
        }

        var administratorEmail =
            configuration[
                "SeedAdmin:Email"];

        var administratorPassword =
            configuration[
                "SeedAdmin:Password"];

        if (string.IsNullOrWhiteSpace(
                administratorEmail) ||
            string.IsNullOrWhiteSpace(
                administratorPassword))
        {
            return;
        }

        var userManager =
            scope.ServiceProvider
                .GetRequiredService<
                    UserManager<ApplicationUser>>();

        var administrator =
            await userManager.FindByEmailAsync(
                administratorEmail.Trim());

        if (administrator is null)
        {
            administrator =
                new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName =
                        administratorEmail.Trim(),
                    Email =
                        administratorEmail.Trim(),
                    EmailConfirmed = true,
                    FirstName = "System",
                    LastName = "Administrator",
                    IsActive = true
                };

            var creationResult =
                await userManager.CreateAsync(
                    administrator,
                    administratorPassword);

            EnsureSucceeded(
                creationResult,
                "creating the development administrator");
        }

        if (!await userManager.IsInRoleAsync(
                administrator,
                ApplicationRoles
                    .SystemAdministrator))
        {
            var roleResult =
                await userManager.AddToRoleAsync(
                    administrator,
                    ApplicationRoles
                        .SystemAdministrator);

            EnsureSucceeded(
                roleResult,
                "assigning the administrator role");
        }
    }

    private static void EnsureSucceeded(
        IdentityResult result,
        string operation)
    {
        if (result.Succeeded)
        {
            return;
        }

        var errors =
            string.Join(
                "; ",
                result.Errors.Select(
                    error =>
                        $"{error.Code}: {error.Description}"));

        throw new InvalidOperationException(
            $"Identity failed while {operation}. {errors}");
    }
}