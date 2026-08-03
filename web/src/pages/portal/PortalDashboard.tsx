import {
  Building2,
  Clock3,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  portalTdClass,
  portalThClass,
  PortalTable,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import type { PortalRole } from '../../navigation/portalNavigation';
import {
  getAdminEmployees,
  getAllUserAccounts,
  type AdminEmployeeResponse,
  type UserAccountResponse,
} from '../../services/adminEmployeesApi';
import {
  getDepartments,
  type DepartmentResponse,
} from '../../services/departmentsApi';
import { ApiError } from '../../services/httpClient';
import {
  getAttendanceDashboard,
  type AttendanceDashboardResponse,
} from '../../services/organisationAttendanceApi';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Dashboard data could not be loaded.';
}

export default function PortalDashboard({ role }: { role: PortalRole }) {
  const navigate = useNavigate();
  const { accessToken, authorizedRoles, setActiveRole } = useSession();
  const [dashboard, setDashboard] = useState<AttendanceDashboardResponse | null>(null);
  const [employees, setEmployees] = useState<AdminEmployeeResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [accounts, setAccounts] = useState<UserAccountResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const attendance = await getAttendanceDashboard(accessToken!);
        if (!active) return;
        setDashboard(attendance);

        if (role === 'admin') {
          const [employeeData, departmentData, accountData] = await Promise.all([
            getAdminEmployees(accessToken!),
            getDepartments(accessToken!),
            getAllUserAccounts(accessToken!),
          ]);
          if (!active) return;
          setEmployees(employeeData);
          setDepartments(departmentData);
          setAccounts(accountData);
        }
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [accessToken, role]);

  const recentActivity = dashboard?.recentActivity ?? [];

  if (role === 'hr') {
    return (
      <div className="mx-auto max-w-6xl">
        <PortalPageHeader
          title="HR Dashboard"
          description="Live attendance information loaded from the PostgreSQL-backed API."
          actions={authorizedRoles.includes('employee') ? (
            <PortalActionButton
              onClick={() => {
                setActiveRole('employee');
                navigate('/clock');
              }}
            >
              <Clock3 className="h-4 w-4" strokeWidth={1.5} />
              Clock in or out
            </PortalActionButton>
          ) : null}
        />
        {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
        <MetricGrid>
          <MetricCard label="Registered employees" value={loading ? '—' : dashboard?.registeredEmployees ?? 0} icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard label="Working" value={loading ? '—' : dashboard?.currentlyWorking ?? 0} icon={<UserCheck className="h-5 w-5" />} tone="green" />
          <MetricCard label="On break" value={loading ? '—' : dashboard?.onBreak ?? 0} icon={<Clock3 className="h-5 w-5" />} tone="amber" />
          <MetricCard label="Missing clock-out" value={loading ? '—' : dashboard?.missingClockOut ?? 0} icon={<ShieldCheck className="h-5 w-5" />} tone="red" />
        </MetricGrid>
        <PortalPanel className="mt-6 p-6">
          <h2 className="text-lg font-bold">Attendance operations</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/hr/attendance" className="rounded-card border border-light-grey bg-white px-4 py-3 text-sm font-semibold hover:bg-light-grey/60">Review attendance</Link>
            <Link to="/hr/reports" className="rounded-card border border-light-grey bg-white px-4 py-3 text-sm font-semibold hover:bg-light-grey/60">Open reports</Link>
          </div>
        </PortalPanel>
      </div>
    );
  }

  const activeEmployees = employees.filter((employee) => employee.isActive).length;
  const activeAccounts = accounts.filter((account) => account.isActive).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Admin Dashboard"
        description="Live workforce and attendance information loaded from the production database."
        actions={<Link to="/admin/employees/new" className="inline-flex min-h-11 items-center rounded-card bg-black px-4 text-sm font-semibold text-white">Add employee</Link>}
      />
      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      <MetricGrid>
        <MetricCard label="Total employees" value={loading ? '—' : employees.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Active employees" value={loading ? '—' : activeEmployees} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Departments" value={loading ? '—' : departments.length} icon={<Building2 className="h-5 w-5" />} />
        <MetricCard label="Active user accounts" value={loading ? '—' : activeAccounts} icon={<ShieldCheck className="h-5 w-5" />} />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="flex items-center justify-between border-b border-light-grey px-5 py-4">
          <h2 className="font-bold">Today&apos;s recent attendance activity</h2>
          <Link to="/admin/reports" className="text-sm font-semibold text-dark-grey hover:text-black">View report</Link>
        </div>
        {recentActivity.length === 0 ? (
          <PortalEmptyState>No attendance events have been recorded today.</PortalEmptyState>
        ) : (
          <PortalTable>
            <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Event</th><th className={portalThClass}>Time</th><th className={portalThClass}>Verification</th></tr></thead>
            <tbody>
              {recentActivity.map((event) => (
                <tr key={event.id}>
                  <td className={portalTdClass}><p className="font-semibold">{event.employeeName}</p><p className="mt-1 text-xs text-dark-grey">{event.employeeNumber}</p></td>
                  <td className={portalTdClass}><PortalStatus value={event.eventType} /></td>
                  <td className={portalTdClass}>{new Date(event.capturedAtUtc).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className={portalTdClass}>{event.verificationMethod}</td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}
