param(
    [string]$RepositoryPath = (Get-Location).Path,
    [string]$MigrationName = "AddWebAuthnDeviceCredentials"
)

$ErrorActionPreference = "Stop"

$repository = (Resolve-Path $RepositoryPath).Path
$backendProject = Join-Path $repository "backend\src\ClockingManagement.Infrastructure"
$startupProject = Join-Path $repository "backend\src\ClockingManagement.Api"
$migrationsDirectory = Join-Path $backendProject "Persistence\Migrations"
$releaseScript = Join-Path $repository "scripts\verify-release.ps1"

if (-not (Test-Path $releaseScript)) {
    throw "Release script was not found at $releaseScript"
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw ".NET SDK was not found on PATH. Install the .NET 8 SDK first."
}

dotnet ef --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "dotnet-ef was not found. Install a compatible EF Core 8 tool before continuing."
}

$existingMigration = Get-ChildItem $migrationsDirectory `
    -Filter "*$MigrationName*.cs" `
    -File `
    -ErrorAction SilentlyContinue | `
    Where-Object { $_.Name -notlike "*.Designer.cs" } | `
    Select-Object -First 1

$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$env:ASPNETCORE_ENVIRONMENT = "Development"

try {
    if (-not $existingMigration) {
        Write-Host "Generating Entity Framework migration $MigrationName..."

        dotnet ef migrations add $MigrationName `
            --project $backendProject `
            --startup-project $startupProject `
            --output-dir "Persistence\Migrations"

        if ($LASTEXITCODE -ne 0) {
            throw "Entity Framework migration generation failed."
        }
    }
    else {
        Write-Host "Migration already exists: $($existingMigration.Name)"
    }
}
finally {
    $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
}

Write-Host "Cleaning generated build and test output..."

$frontendResidue = @(
    (Join-Path $repository "web\node_modules")
    (Join-Path $repository "web\dist")
    (Join-Path $repository "web\coverage")
    (Join-Path $repository "web\tests\.compiled")
)

Remove-Item $frontendResidue `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue

Get-ChildItem (Join-Path $repository "backend") `
    -Directory `
    -Recurse `
    -ErrorAction SilentlyContinue | `
    Where-Object {
        $_.Name -in @("bin", "obj", "TestResults")
    } | `
    Remove-Item `
        -Recurse `
        -Force `
        -ErrorAction SilentlyContinue

Write-Host "Running the repository release gate..."
& $releaseScript

if ($LASTEXITCODE -ne 0) {
    throw "Release verification failed."
}

Write-Host "WebAuthn release preparation completed successfully."
Write-Host "Review and commit the generated migration before deployment."
