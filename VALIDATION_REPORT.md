# Validation Report

Validation date: 2026-08-03

This report records checks that were run against the deploy-ready source package in the available build environment. It is evidence of source-level validation, not proof that the application has already been deployed.

## Completed checks

| Check | Result |
|---|---|
| Frontend TypeScript/TSX syntax transpilation | 98 files checked, 0 failures |
| Frontend relative-import resolution | 98 files checked, 0 missing imports |
| Frontend pure TypeScript test compilation | Passed |
| Frontend Node test suite | 16 passed, 0 failed |
| Supplemental frontend semantic TypeScript pass using temporary dependency declarations | Passed |
| Backend C# lexical and delimiter scan | 82 files checked, 0 failures |
| JSON parsing | 10 files parsed, 0 failures |
| MSBuild XML parsing | 6 files parsed, 0 failures |
| Forbidden secret-file scan | 0 files found |
| Obvious private-key, PostgreSQL credential-URL and bearer-token scan | 0 matches |
| Committed `Jwt:SigningKey` | Confirmed empty |
| Full deploy-ready ZIP replay comparison | Exact match with working release tree |
| Patch replay against the uploaded baseline | Exact match with working release tree |
| SHA-256 file manifest | 241 entries verified |

The supplemental TypeScript pass uses temporary declarations because third-party packages could not be installed in this environment. It catches internal TypeScript consistency and import issues, but it is not a replacement for the real dependency-aware production build.

## Environment limitations

A full frontend dependency installation could not be completed here because the sandbox's internal npm mirror returned HTTP 404 for `yallist@3.1.1`. The lockfile points to the normal npm registry, so this is an environment registry-cache failure rather than evidence of a project lockfile error.

The .NET SDK is not installed in this environment. Consequently, `dotnet restore`, `dotnet build` and `dotnet test` could not be executed here.

## Required release gate

Run this on the developer machine or allow GitHub Actions to run it before deployment:

```powershell
.\scripts\verify-release.ps1
```

That script performs:

```text
npm ci
npm test
npm run build
dotnet restore ClockingManagement.sln
dotnet build ClockingManagement.sln --configuration Release --no-restore
dotnet test ClockingManagement.sln --configuration Release --no-build
```

Deployment must wait for all commands and the GitHub Actions workflow to pass.

## Security action still required

Rotate the Railway `Jwt__SigningKey` before release because an earlier development copy contained a hardcoded signing key. Do not reuse the earlier value. Rotating it invalidates existing sessions, so all users will need to log in again.
