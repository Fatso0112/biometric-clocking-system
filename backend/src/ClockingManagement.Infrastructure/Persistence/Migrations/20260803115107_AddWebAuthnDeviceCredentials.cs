using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClockingManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWebAuthnDeviceCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "intended_event_type",
                table: "biometric_verification_sessions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "webauthn_challenges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ceremony_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    intended_event_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    options_json = table.Column<string>(type: "text", nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    used_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_webauthn_challenges", x => x.id);
                    table.ForeignKey(
                        name: "FK_webauthn_challenges_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "webauthn_credentials",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    credential_id = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    public_key = table.Column<byte[]>(type: "bytea", nullable: false),
                    user_handle = table.Column<byte[]>(type: "bytea", nullable: false),
                    sign_count = table.Column<long>(type: "bigint", nullable: false),
                    aaguid = table.Column<Guid>(type: "uuid", nullable: false),
                    transports = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    device_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_used_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revoked_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_webauthn_credentials", x => x.id);
                    table.ForeignKey(
                        name: "FK_webauthn_credentials_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_webauthn_challenges_employee_ceremony_expiry",
                table: "webauthn_challenges",
                columns: new[] { "employee_id", "ceremony_type", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_webauthn_credentials_employee_active",
                table: "webauthn_credentials",
                columns: new[] { "employee_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ux_webauthn_credentials_credential_id",
                table: "webauthn_credentials",
                column: "credential_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "webauthn_challenges");

            migrationBuilder.DropTable(
                name: "webauthn_credentials");

            migrationBuilder.DropColumn(
                name: "intended_event_type",
                table: "biometric_verification_sessions");
        }
    }
}
