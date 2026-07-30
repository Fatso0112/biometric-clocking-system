using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClockingManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBiometricProfileAndEnrolments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "biometric_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_biometric_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_biometric_profiles_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "biometric_registration_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_modality = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    requested_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    review_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_biometric_registration_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_biometric_registration_requests_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "biometric_enrolments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    biometric_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modality = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    provider_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_reference = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    quality_score = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    enrolled_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    disabled_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_biometric_enrolments", x => x.id);
                    table.ForeignKey(
                        name: "FK_biometric_enrolments_biometric_profiles_biometric_profile_id",
                        column: x => x.biometric_profile_id,
                        principalTable: "biometric_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "biometric_recognition_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    biometric_enrolment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    modality = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    provider_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    outcome = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    confidence = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: true),
                    failure_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    attempted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_biometric_recognition_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_biometric_recognition_attempts_biometric_enrolments_biometr~",
                        column: x => x.biometric_enrolment_id,
                        principalTable: "biometric_enrolments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_biometric_recognition_attempts_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_biometric_enrolments_profile_modality_status",
                table: "biometric_enrolments",
                columns: new[] { "biometric_profile_id", "modality", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_biometric_enrolments_provider_reference",
                table: "biometric_enrolments",
                columns: new[] { "provider_name", "external_reference" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_biometric_profiles_employee_id",
                table: "biometric_profiles",
                column: "employee_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_biometric_recognition_attempts_biometric_enrolment_id",
                table: "biometric_recognition_attempts",
                column: "biometric_enrolment_id");

            migrationBuilder.CreateIndex(
                name: "ix_biometric_recognition_attempts_employee_time",
                table: "biometric_recognition_attempts",
                columns: new[] { "employee_id", "attempted_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_biometric_registration_requests_employee_status",
                table: "biometric_registration_requests",
                columns: new[] { "employee_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "biometric_recognition_attempts");

            migrationBuilder.DropTable(
                name: "biometric_registration_requests");

            migrationBuilder.DropTable(
                name: "biometric_enrolments");

            migrationBuilder.DropTable(
                name: "biometric_profiles");
        }
    }
}
