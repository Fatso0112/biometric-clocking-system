using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class WebAuthnChallengeConfiguration
    : IEntityTypeConfiguration<WebAuthnChallenge>
{
    public void Configure(
        EntityTypeBuilder<WebAuthnChallenge> builder)
    {
        builder.ToTable("webauthn_challenges");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id)
            .HasColumnName("id");

        builder.Property(item => item.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(item => item.CeremonyType)
            .HasColumnName("ceremony_type")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(item => item.IntendedEventType)
            .HasColumnName("intended_event_type")
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(item => item.OptionsJson)
            .HasColumnName("options_json")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(item => item.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(item => item.UsedAtUtc)
            .HasColumnName("used_at_utc");

        builder.Property(item => item.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(item => new
            {
                item.EmployeeId,
                item.CeremonyType,
                item.ExpiresAtUtc
            })
            .HasDatabaseName(
                "ix_webauthn_challenges_employee_ceremony_expiry");

        builder.HasOne(item => item.Employee)
            .WithMany(employee =>
                employee.WebAuthnChallenges)
            .HasForeignKey(item => item.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
