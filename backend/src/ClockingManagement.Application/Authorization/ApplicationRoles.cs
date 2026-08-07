namespace ClockingManagement.Application.Authorization;

public static class ApplicationRoles
{
    public const string Employee =
        "Employee";

    public const string Supervisor =
        "Supervisor";

    public const string HROfficer =
        "HROfficer";

    public const string PayrollOfficer =
        "PayrollOfficer";

    public const string SystemAdministrator =
        "SystemAdministrator";

    public const string ExecutiveViewer =
        "ExecutiveViewer";

    public static readonly IReadOnlyCollection<string>
        All =
            new[]
            {
                Employee,
                Supervisor,
                HROfficer,
                PayrollOfficer,
                SystemAdministrator,
                ExecutiveViewer
            };
}

public static class AuthorizationPolicies
{
    public const string ManageEmployees =
        "ManageEmployees";

    public const string ManageWorkLocations =
        "ManageWorkLocations";

    public const string ManageBiometrics =
        "ManageBiometrics";

    public const string ReviewAttendanceCorrections =
        "ReviewAttendanceCorrections";

    public const string ViewTeamAttendance =
        "ViewTeamAttendance";

    public const string ViewOrganisationReports =
        "ViewOrganisationReports";

    public const string ManageSystemConfiguration =
        "ManageSystemConfiguration";

    public const string ManageUserAccounts =
        "ManageUserAccounts";

    public const string ManageUserRoles =
        "ManageUserRoles";

    public const string ResetEmployeePasswords =
        "ResetEmployeePasswords";

    public const string ViewEmployees =
        "ViewEmployees";

    public const string ViewWorkLocations =
        "ViewWorkLocations";

    public const string ViewAttendanceHistory =
        "ViewAttendanceHistory";

    public const string ViewAttendanceDashboard =
        "ViewAttendanceDashboard";

    public const string ViewPayroll =
        "ViewPayroll";

    public const string ManagePayroll =
        "ManagePayroll";

    public const string ApprovePayroll =
        "ApprovePayroll";
}