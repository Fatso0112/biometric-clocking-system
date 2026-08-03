using ClockingManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class WebAuthnCredentialConfiguration
    : IEntityTypeConfiguration<WebAuthnCredential>
{
    public void Configure(
        EntityTypeBuilder<WebAuthnCredential> builder)
    {
        builder.ToTable("webauthn_credentials");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id)
            .HasColumnName("id");

        builder.Property(item => item.EmployeeId)
            .HasColumnName("employee_id")
            .IsRequired();

        builder.Property(item => item.CredentialId)
            .HasColumnName("credential_id")
            .HasMaxLength(1024)
            .IsRequired();

        builder.Property(item => item.PublicKey)
            .HasColumnName("public_key")
            .IsRequired();

        builder.Property(item => item.UserHandle)
            .HasColumnName("user_handle")
            .IsRequired();

        builder.Property(item => item.SignCount)
            .HasColumnName("sign_count")
            .IsRequired();

        builder.Property(item => item.AaGuid)
            .HasColumnName("aaguid")
            .IsRequired();

        builder.Property(item => item.Transports)
            .HasColumnName("transports")
            .HasMaxLength(200);

        builder.Property(item => item.DeviceName)
            .HasColumnName("device_name")
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(item => item.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(item => item.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(item => item.LastUsedAtUtc)
            .HasColumnName("last_used_at_utc");

        builder.Property(item => item.RevokedAtUtc)
            .HasColumnName("revoked_at_utc");

        builder.HasIndex(item => item.CredentialId)
            .IsUnique()
            .HasDatabaseName(
                "ux_webauthn_credentials_credential_id");

        builder.HasIndex(item => new
            {
                item.EmployeeId,
                item.IsActive
            })
            .HasDatabaseName(
                "ix_webauthn_credentials_employee_active");

        builder.HasOne(item => item.Employee)
            .WithMany(employee =>
                employee.WebAuthnCredentials)
            .HasForeignKey(item => item.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
