using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClockingManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pay_rate_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hourly_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pay_rate_history", x => x.id);
                    table.CheckConstraint("ck_pay_rate_history_effective_period", "effective_to IS NULL OR effective_to >= effective_from");
                    table.CheckConstraint("ck_pay_rate_history_hourly_rate", "hourly_rate > 0");
                    table.ForeignKey(
                        name: "FK_pay_rate_history_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_pay_rate_history_created_by_user",
                        column: x => x.created_by_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payroll_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    run_date_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_runs", x => x.id);
                    table.CheckConstraint("ck_payroll_runs_approved_fields", "status <> 'Approved' OR (approved_by_user_id IS NOT NULL AND approved_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_payroll_runs_period", "period_end >= period_start");
                    table.ForeignKey(
                        name: "fk_payroll_runs_approved_by_user",
                        column: x => x.approved_by_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_payroll_runs_created_by_user",
                        column: x => x.created_by_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payroll_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payroll_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    worked_minutes = table.Column<int>(type: "integer", nullable: false),
                    break_minutes = table.Column<int>(type: "integer", nullable: false),
                    hours_worked = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    rate_applied = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    gross_pay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    has_exceptions = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_entries", x => x.id);
                    table.CheckConstraint("ck_payroll_entries_break_minutes", "break_minutes >= 0");
                    table.CheckConstraint("ck_payroll_entries_gross_pay", "gross_pay IS NULL OR gross_pay >= 0");
                    table.CheckConstraint("ck_payroll_entries_hours_worked", "hours_worked >= 0");
                    table.CheckConstraint("ck_payroll_entries_rate_applied", "rate_applied IS NULL OR rate_applied > 0");
                    table.CheckConstraint("ck_payroll_entries_ready_values", "has_exceptions OR (rate_applied IS NOT NULL AND gross_pay IS NOT NULL)");
                    table.CheckConstraint("ck_payroll_entries_worked_minutes", "worked_minutes >= 0");
                    table.ForeignKey(
                        name: "FK_payroll_entries_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payroll_entries_payroll_runs_payroll_run_id",
                        column: x => x.payroll_run_id,
                        principalTable: "payroll_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pay_rate_history_created_by_user_id",
                table: "pay_rate_history",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_pay_rate_history_employee_effective_to",
                table: "pay_rate_history",
                columns: new[] { "employee_id", "effective_to" });

            migrationBuilder.CreateIndex(
                name: "ux_pay_rate_history_employee_effective_from",
                table: "pay_rate_history",
                columns: new[] { "employee_id", "effective_from" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_payroll_entries_employee_id",
                table: "payroll_entries",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "ux_payroll_entries_run_employee",
                table: "payroll_entries",
                columns: new[] { "payroll_run_id", "employee_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payroll_runs_approved_by_user_id",
                table: "payroll_runs",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_runs_created_by_user_id",
                table: "payroll_runs",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_payroll_runs_period",
                table: "payroll_runs",
                columns: new[] { "period_start", "period_end" });

            migrationBuilder.CreateIndex(
                name: "ix_payroll_runs_status",
                table: "payroll_runs",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pay_rate_history");

            migrationBuilder.DropTable(
                name: "payroll_entries");

            migrationBuilder.DropTable(
                name: "payroll_runs");
        }
    }
}
