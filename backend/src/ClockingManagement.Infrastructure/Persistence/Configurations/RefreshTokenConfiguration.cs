using ClockingManagement.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClockingManagement.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration
    : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(
        EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(token => token.Id);

        builder.Property(token => token.Id)
            .HasColumnName("id");

        builder.Property(token => token.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(token => token.TokenHash)
            .HasColumnName("token_hash")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(token => token.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(token => token.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(token => token.RevokedAtUtc)
            .HasColumnName("revoked_at_utc");

        builder.Property(
                token => token.ReplacedByTokenHash)
            .HasColumnName(
                "replaced_by_token_hash")
            .HasMaxLength(128);

        builder.Property(
                token => token.CreatedByIpAddress)
            .HasColumnName(
                "created_by_ip_address")
            .HasMaxLength(45);

        builder.Property(
                token => token.RevokedByIpAddress)
            .HasColumnName(
                "revoked_by_ip_address")
            .HasMaxLength(45);

        builder.HasIndex(token => token.TokenHash)
            .IsUnique()
            .HasDatabaseName(
                "ux_refresh_tokens_token_hash");

        builder.HasIndex(token => token.UserId)
            .HasDatabaseName(
                "ix_refresh_tokens_user_id");

        builder.HasOne(token => token.User)
            .WithMany(user => user.RefreshTokens)
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}