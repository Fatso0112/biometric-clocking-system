import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import {
  assignPortalRole,
  assignPortalTeamMember,
  revokePortalRole,
} from '../../services/portalDemoRepository';
import type { UserRole } from '../../types/session';
import { getDisplayName } from '../../utils/portalFormatters';

type PrivilegedRole = Exclude<UserRole, 'employee'>;

export default function AdminRoleAssignments() {
  const state = usePortalDemo();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const initialRole: PrivilegedRole = requestedRole === 'hr' || requestedRole === 'supervisor' || requestedRole === 'admin' ? requestedRole : 'hr';
  const [employeeNumber, setEmployeeNumber] = useState(state.employees[0]?.employeeNumber ?? '');
  const [role, setRole] = useState<PrivilegedRole>(initialRole);
  const [supervisorEmployeeNumber, setSupervisorEmployeeNumber] = useState('20001');
  const [memberEmployeeNumber, setMemberEmployeeNumber] = useState('E10001');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const employeesByNumber = useMemo(
    () => new Map(state.employees.map((employee) => [employee.employeeNumber, employee])),
    [state.employees],
  );
  const privilegedAssignments = state.roleAssignments.filter(
    (assignment) => assignment.active && assignment.role !== 'employee',
  );
  const supervisorNumbers = new Set(
    state.roleAssignments
      .filter((assignment) => assignment.active && assignment.role === 'supervisor')
      .map((assignment) => assignment.employeeNumber),
  );
  const supervisors = state.employees.filter((employee) => supervisorNumbers.has(employee.employeeNumber));

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Role and team assignments" description="Frontend-only administration of HR, Admin, Supervisor, and team relationships. Every change is recorded in the demo audit log." />
      <MetricGrid>
        <MetricCard label="HR officers" value={privilegedAssignments.filter((item) => item.role === 'hr').length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Supervisors" value={privilegedAssignments.filter((item) => item.role === 'supervisor').length} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="Administrators" value={privilegedAssignments.filter((item) => item.role === 'admin').length} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="Team assignments" value={state.teamAssignments.filter((item) => item.active).length} icon={<UserPlus className="h-5 w-5" />} />
      </MetricGrid>
      {message ? <PortalNotice tone={message.error ? 'error' : 'success'}>{message.text}</PortalNotice> : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PortalPanel className="p-5">
          <h2 className="font-bold">Grant a role</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            assignPortalRole(employeeNumber, role, actorEmployeeNumber ?? '40001');
            setMessage({ text: `${role} role granted.`, error: false });
          }}>
            <PortalField label="Employee"><select value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} className={portalInputClass}>{state.employees.filter((employee) => employee.status === 'active').map((employee) => <option key={employee.employeeNumber} value={employee.employeeNumber}>{getDisplayName(employee.firstName, employee.lastName)} · {employee.employeeNumber}</option>)}</select></PortalField>
            <PortalField label="Role"><select value={role} onChange={(event) => setRole(event.target.value as PrivilegedRole)} className={portalInputClass}><option value="hr">HR</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option></select></PortalField>
            <PortalActionButton type="submit" className="sm:col-span-2"><UserPlus className="h-4 w-4" /> Grant role</PortalActionButton>
          </form>
        </PortalPanel>
        <PortalPanel className="p-5">
          <h2 className="font-bold">Assign a team member</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            assignPortalTeamMember(supervisorEmployeeNumber, memberEmployeeNumber, actorEmployeeNumber ?? '40001');
            setMessage({ text: 'Team assignment saved.', error: false });
          }}>
            <PortalField label="Supervisor"><select required value={supervisorEmployeeNumber} onChange={(event) => setSupervisorEmployeeNumber(event.target.value)} className={portalInputClass}>{supervisors.map((employee) => <option key={employee.employeeNumber} value={employee.employeeNumber}>{getDisplayName(employee.firstName, employee.lastName)}</option>)}</select></PortalField>
            <PortalField label="Team member"><select required value={memberEmployeeNumber} onChange={(event) => setMemberEmployeeNumber(event.target.value)} className={portalInputClass}>{state.employees.filter((employee) => employee.status === 'active' && !supervisorNumbers.has(employee.employeeNumber)).map((employee) => <option key={employee.employeeNumber} value={employee.employeeNumber}>{getDisplayName(employee.firstName, employee.lastName)} · {employee.employeeNumber}</option>)}</select></PortalField>
            <PortalActionButton type="submit" className="sm:col-span-2"><UsersRound className="h-4 w-4" /> Save team assignment</PortalActionButton>
          </form>
        </PortalPanel>
      </div>
      <PortalPanel className="mt-6">
        <div className="border-b border-light-grey px-5 py-4"><h2 className="font-bold">Privileged role assignments</h2></div>
        <PortalTable>
          <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Role</th><th className={portalThClass}>Assigned</th><th className={portalThClass}>Status</th><th className={portalThClass}>Action</th></tr></thead>
          <tbody>{privilegedAssignments.map((assignment) => {
            const employee = employeesByNumber.get(assignment.employeeNumber);
            const isOwnAdminRole = assignment.employeeNumber === actorEmployeeNumber && assignment.role === 'admin';
            return <tr key={assignment.id}><td className={portalTdClass}><p className="font-semibold">{employee ? getDisplayName(employee.firstName, employee.lastName) : assignment.employeeNumber}</p><p className="mt-1 text-xs text-dark-grey">{assignment.employeeNumber}</p></td><td className={`${portalTdClass} capitalize`}>{assignment.role}</td><td className={portalTdClass}>{new Date(assignment.assignedAt).toLocaleDateString('en-ZA')}</td><td className={portalTdClass}><PortalStatus value="active" /></td><td className={portalTdClass}><PortalActionButton disabled={isOwnAdminRole} tone="danger" className="min-h-9 px-3 text-xs" onClick={() => { revokePortalRole(assignment.employeeNumber, assignment.role as PrivilegedRole, actorEmployeeNumber ?? '40001'); setMessage({ text: 'Role revoked.', error: false }); }}>Revoke</PortalActionButton></td></tr>;
          })}</tbody>
        </PortalTable>
      </PortalPanel>
    </div>
  );
}
