$ErrorActionPreference = "Stop"

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
    npm ci
    npm test
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Building and testing backend..."
Push-Location $root
try {
    dotnet restore ClockingManagement.sln
    dotnet build ClockingManagement.sln --configuration Release --no-restore
    dotnet test ClockingManagement.sln --configuration Release --no-build
}
finally {
    Pop-Location
}

Write-Host "Release verification completed successfully."
