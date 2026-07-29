namespace ClockingManagement.Domain.Entities;

public sealed class WorkLocation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public int AllowedRadiusMetres { get; set; } = 100;

    public bool IsActive { get; set; } = true;
    

    public DateTimeOffset CreatedAtUtc { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAtUtc { get; set; }

    public bool RequireIpMatch { get; set; } = true;

    public bool RequireGeofence { get; set; } = true;

    public int MaximumLocationAccuracyMetres { get; set; } = 100;

    public ICollection<WorkLocationAllowedNetwork>
        AllowedNetworks { get; set; } =
            new List<WorkLocationAllowedNetwork>();

    public ICollection<Employee> Employees { get; set; } =
        new List<Employee>();
}