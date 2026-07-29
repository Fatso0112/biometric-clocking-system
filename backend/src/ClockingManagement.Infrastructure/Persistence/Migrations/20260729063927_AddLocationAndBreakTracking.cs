using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClockingManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationAndBreakTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "maximum_location_accuracy_metres",
                table: "work_locations",
                type: "integer",
                nullable: false,
                defaultValue: 100);

            migrationBuilder.AddColumn<bool>(
                name: "require_geofence",
                table: "work_locations",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "require_ip_match",
                table: "work_locations",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "distance_from_work_location_metres",
                table: "attendance_events",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ip_address",
                table: "attendance_events",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_allowed_network",
                table: "attendance_events",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_inside_geofence",
                table: "attendance_events",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "latitude",
                table: "attendance_events",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "location_accuracy_metres",
                table: "attendance_events",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "location_captured_at_utc",
                table: "attendance_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "longitude",
                table: "attendance_events",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "work_location_allowed_networks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    work_location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    network_cidr = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_location_allowed_networks", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_location_allowed_networks_work_locations_work_location~",
                        column: x => x.work_location_id,
                        principalTable: "work_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_work_locations_accuracy_positive",
                table: "work_locations",
                sql: "maximum_location_accuracy_metres > 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_attendance_events_distance",
                table: "attendance_events",
                sql: "distance_from_work_location_metres IS NULL OR distance_from_work_location_metres >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_attendance_events_latitude",
                table: "attendance_events",
                sql: "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_attendance_events_location_accuracy",
                table: "attendance_events",
                sql: "location_accuracy_metres IS NULL OR location_accuracy_metres >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_attendance_events_longitude",
                table: "attendance_events",
                sql: "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)");

            migrationBuilder.CreateIndex(
                name: "ux_work_location_networks_location_cidr",
                table: "work_location_allowed_networks",
                columns: new[] { "work_location_id", "network_cidr" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "work_location_allowed_networks");

            migrationBuilder.DropCheckConstraint(
                name: "ck_work_locations_accuracy_positive",
                table: "work_locations");

            migrationBuilder.DropCheckConstraint(
                name: "ck_attendance_events_distance",
                table: "attendance_events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_attendance_events_latitude",
                table: "attendance_events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_attendance_events_location_accuracy",
                table: "attendance_events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_attendance_events_longitude",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "maximum_location_accuracy_metres",
                table: "work_locations");

            migrationBuilder.DropColumn(
                name: "require_geofence",
                table: "work_locations");

            migrationBuilder.DropColumn(
                name: "require_ip_match",
                table: "work_locations");

            migrationBuilder.DropColumn(
                name: "distance_from_work_location_metres",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "ip_address",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "is_allowed_network",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "is_inside_geofence",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "latitude",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "location_accuracy_metres",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "location_captured_at_utc",
                table: "attendance_events");

            migrationBuilder.DropColumn(
                name: "longitude",
                table: "attendance_events");
        }
    }
}
