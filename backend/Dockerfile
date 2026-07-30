FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /source

COPY src/ClockingManagement.Domain/ClockingManagement.Domain.csproj src/ClockingManagement.Domain/
COPY src/ClockingManagement.Application/ClockingManagement.Application.csproj src/ClockingManagement.Application/
COPY src/ClockingManagement.Infrastructure/ClockingManagement.Infrastructure.csproj src/ClockingManagement.Infrastructure/
COPY src/ClockingManagement.Api/ClockingManagement.Api.csproj src/ClockingManagement.Api/

RUN dotnet restore src/ClockingManagement.Api/ClockingManagement.Api.csproj

COPY src/ src/

RUN dotnet publish src/ClockingManagement.Api/ClockingManagement.Api.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "ClockingManagement.Api.dll"]
