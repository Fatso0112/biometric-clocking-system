import {
  Building2,
  CalendarCheck2,
  Clock3,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  portalTdClass,
  portalThClass,
  PortalTable,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import type { PortalRole } from '../../navigation/portalNavigation';

export default function PortalDashboard({ role }: { role: PortalRole }) {
  const state = usePortalDemo();
  const navigate = useNavigate();
  const { authorizedRoles, setActiveRole } = useSession();
  const activeEmployees = state.employees.filter((employee) => employee.status === 'active');
  const activeSupervisors = new Set(
    state.roleAssignments
      .filter((assignment) => assignment.active && assignment.role === 'supervisor')
      .map((assignment) => assignment.employeeNumber),
  );
  const today = state.attendance.reduce((latest, record) =>
    record.workDate > latest ? record.workDate : latest, '');
  const todayAttendance = state.attendance.filter((record) => record.workDate === today);
  const recentAudits = state.auditEvents.slice(0, 5);

  if (role === 'hr') {
    return (
      <div className="mx-auto max-w-6xl">
        <PortalPageHeader
          title="HR Dashboard"
          description="Monitor attendance and workforce activity from the shared frontend demo repository."
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
        <MetricGrid>
          <MetricCard label="Active employees" value={activeEmployees.length} icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard label="Present" value={todayAttendance.filter((item) => item.status === 'present').length} icon={<UserCheck className="h-5 w-5" />} tone="green" />
          <MetricCard label="Late" value={todayAttendance.filter((item) => item.status === 'late').length} icon={<Clock3 className="h-5 w-5" />} tone="amber" />
          <MetricCard label="Absent" value={todayAttendance.filter((item) => item.status === 'absent').length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="red" />
        </MetricGrid>
        <PortalPanel className="mt-6 p-6">
          <h2 className="text-lg font-bold">Common HR tasks</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/hr/attendance" className="rounded-card border border-light-grey bg-white px-4 py-3 text-sm font-semibold hover:bg-light-grey/60">Review attendance</Link>
            <Link to="/hr/reports" className="rounded-card border border-light-grey bg-white px-4 py-3 text-sm font-semibold hover:bg-light-grey/60">Open reports</Link>
            <Link to="/hr/payroll" className="rounded-card border border-light-grey bg-white px-4 py-3 text-sm font-semibold hover:bg-light-grey/60">Review payroll</Link>
          </div>
        </PortalPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Admin Dashboard"
        description="Manage people, organizational structure, access, and operational records in the frontend demo workspace."
        actions={<Link to="/admin/employees/new" className="inline-flex min-h-11 items-center rounded-card bg-black px-4 text-sm font-semibold text-white">Add employee</Link>}
      />
      <MetricGrid>
        <MetricCard label="Total employees" value={state.employees.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Active employees" value={activeEmployees.length} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Departments" value={state.departments.length} icon={<Building2 className="h-5 w-5" />} />
        <MetricCard label="Supervisors" value={activeSupervisors.size} icon={<ShieldCheck className="h-5 w-5" />} />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="flex items-center justify-between border-b border-light-grey px-5 py-4">
          <h2 className="font-bold">Recent activity</h2>
          <Link to="/admin/audit-logs" className="text-sm font-semibold text-dark-grey hover:text-black">View all</Link>
        </div>
        <PortalTable>
          <thead><tr><th className={portalThClass}>Action</th><th className={portalThClass}>Target</th><th className={portalThClass}>Actor</th><th className={portalThClass}>Status</th></tr></thead>
          <tbody>
            {recentAudits.map((event) => (
              <tr key={event.id}>
                <td className={portalTdClass}><p className="font-semibold">{event.action}</p><p className="mt-1 text-xs text-dark-grey">{event.detail}</p></td>
                <td className={portalTdClass}>{event.target}</td>
                <td className={portalTdClass}>{event.actorEmployeeNumber}</td>
                <td className={portalTdClass}><PortalStatus value="recorded" /></td>
              </tr>
            ))}
          </tbody>
        </PortalTable>
      </PortalPanel>
    </div>
  );
}
