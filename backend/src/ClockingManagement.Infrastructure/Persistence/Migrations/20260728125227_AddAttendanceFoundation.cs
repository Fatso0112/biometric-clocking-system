using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClockingManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "biometric_verification_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    verification_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    used_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_biometric_verification_sessions", x => x.id);
                    table.CheckConstraint("ck_biometric_sessions_confidence", "confidence >= 0 AND confidence <= 100");
                    table.ForeignKey(
                        name: "FK_biometric_verification_sessions_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "attendance_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    biometric_verification_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    verification_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    biometric_confidence = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    client_event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    captured_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_events", x => x.id);
                    table.CheckConstraint("ck_attendance_events_confidence", "biometric_confidence IS NULL OR (biometric_confidence >= 0 AND biometric_confidence <= 100)");
                    table.ForeignKey(
                        name: "FK_attendance_events_biometric_verification_sessions_biometric~",
                        column: x => x.biometric_verification_session_id,
                        principalTable: "biometric_verification_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attendance_events_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_events_employee_captured_at",
                table: "attendance_events",
                columns: new[] { "employee_id", "captured_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_attendance_events_client_event_id",
                table: "attendance_events",
                column: "client_event_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_attendance_events_verification_session",
                table: "attendance_events",
                column: "biometric_verification_session_id",
                unique: true,
                filter: "biometric_verification_session_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_biometric_sessions_employee_expiry",
                table: "biometric_verification_sessions",
                columns: new[] { "employee_id", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ux_biometric_sessions_token_hash",
                table: "biometric_verification_sessions",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_events");

            migrationBuilder.DropTable(
                name: "biometric_verification_sessions");
        }
    }
}
