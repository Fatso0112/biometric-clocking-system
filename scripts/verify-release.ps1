$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)]
        [scriptblock]$Command,

        [Parameter(Mandatory)]
        [string]$FailureMessage
    )

    & $Command

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "$FailureMessage Exit code: $exitCode"
    }
}

$root = Split-Path -Parent $PSScriptRoot

Write-Host "Checking for commonly committed secret files..."
$forbiddenFiles = Get-ChildItem $root -Recurse -File -Force |
    Where-Object {
        $_.FullName -notmatch '[\\/]node_modules[\\/]|[\\/]bin[\\/]|[\\/]obj[\\/]|[\\/]dist[\\/]|[\\/]\.git[\\/]' -and
        ($_.Name -eq '.env' -or
         $_.Name -eq '.env.local' -or
         $_.Name -like 'appsettings.*.local.json' -or
         $_.Extension -in '.pfx', '.p12', '.pem', '.key')
    }

if ($forbiddenFiles) {
    $forbiddenFiles | ForEach-Object { Write-Host "Forbidden file: $($_.FullName)" }
    throw "Remove secret-bearing files before release."
}

Write-Host "Checking for generated or patch residue..."
$residuePaths = @(
    "attendance-live-patch",
    "core-integration-patch",
    "web\tests\.compiled",
    "web\node_modules",
    "web\dist"
) |
    ForEach-Object { Join-Path $root $_ } |
    Where-Object { Test-Path $_ }

if ($residuePaths) {
    $residuePaths | ForEach-Object { Write-Host "Release residue: $_" }
    throw "Remove generated patch/build residue before release."
}

$appSettingsPath = Join-Path $root "backend\src\ClockingManagement.Api\appsettings.json"
$appSettings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json

if (-not [string]::IsNullOrWhiteSpace([string]$appSettings.Jwt.SigningKey)) {
    throw "The committed appsettings.json must not contain a JWT signing key."
}

Write-Host "Scanning source files for obvious committed credentials..."
$scannableFiles = Get-ChildItem $root -Recurse -File -Force |
    Where-Object {
        $_.FullName -notmatch '[\\/]node_modules[\\/]|[\\/]bin[\\/]|[\\/]obj[\\/]|[\\/]dist[\\/]|[\\/]\.git[\\/]|[\\/]tests[\\/]\.compiled[\\/]' -and
        $_.Name -notin @('package-lock.json', '.env.example') -and
        $_.Extension -in @('.cs', '.ts', '.tsx', '.js', '.cjs', '.json', '.yml', '.yaml', '.ps1')
    }

$credentialPatterns = @(
    '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'postgres(?:ql)?://[^\s"'']+',
    'Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
)

$credentialMatches = $scannableFiles |
    Select-String -Pattern $credentialPatterns

if ($credentialMatches) {
    $credentialMatches | ForEach-Object {
        Write-Host "Possible credential: $($_.Path):$($_.LineNumber)"
    }
    throw "Remove possible committed credentials before release."
}

Write-Host "Building and testing frontend..."
Push-Location "$root\web"
try {
    Invoke-CheckedCommand `
        -Command { npm ci } `
        -FailureMessage "Frontend dependency installation failed."

    Invoke-CheckedCommand `
        -Command { npm test } `
        -FailureMessage "Frontend tests failed."

    Invoke-CheckedCommand `
        -Command { npm run build } `
        -FailureMessage "Frontend production build failed."
}
finally {
    Pop-Location
}

Write-Host "Building and testing backend..."
Push-Location $root
try {
    Invoke-CheckedCommand `
        -Command {
            dotnet restore ClockingManagement.sln
        } `
        -FailureMessage "Backend restore failed."

    Invoke-CheckedCommand `
        -Command {
            dotnet build ClockingManagement.sln `
                --configuration Release `
                --no-restore
        } `
        -FailureMessage "Backend build failed."

    Invoke-CheckedCommand `
        -Command {
            dotnet test ClockingManagement.sln `
                --configuration Release `
                --no-build
        } `
        -FailureMessage "Backend tests failed."
}
finally {
    Pop-Location
}

Write-Host "Release verification completed successfully."
