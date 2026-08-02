import { Search, UserCog, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
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
import { setPortalEmployeeStatus } from '../../services/portalDemoRepository';
import { getDisplayName } from '../../utils/portalFormatters';

export default function AdminUsers() {
  const state = usePortalDemo();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const [query, setQuery] = useState('');
  const rolesByEmployee = useMemo(() => {
    const roles = new Map<string, string[]>();
    for (const assignment of state.roleAssignments) {
      if (assignment.active) roles.set(assignment.employeeNumber, [...(roles.get(assignment.employeeNumber) ?? []), assignment.role]);
    }
    return roles;
  }, [state.roleAssignments]);
  const normalizedQuery = query.toLowerCase().trim();
  const users = state.employees.filter((employee) => !normalizedQuery || `${employee.employeeNumber} ${employee.firstName} ${employee.lastName} ${employee.email}`.toLowerCase().includes(normalizedQuery));

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Users" description="A projection of employee records and active role assignments. There is no separate duplicate User authority." />
      <MetricGrid>
        <MetricCard label="User records" value={state.employees.length} icon={<UserCog className="h-5 w-5" />} />
        <MetricCard label="Active" value={state.employees.filter((employee) => employee.status === 'active').length} icon={<UserCog className="h-5 w-5" />} tone="green" />
        <MetricCard label="Inactive" value={state.employees.filter((employee) => employee.status === 'inactive').length} icon={<UserX className="h-5 w-5" />} tone="red" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="border-b border-light-grey p-4"><label className="relative block max-w-lg"><span className="sr-only">Search users</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${portalInputClass} pl-11`} placeholder="Search users" /></label></div>
        <PortalTable><thead><tr><th className={portalThClass}>User</th><th className={portalThClass}>Employee No.</th><th className={portalThClass}>Roles</th><th className={portalThClass}>Status</th><th className={portalThClass}>Action</th></tr></thead><tbody>{users.map((employee) => <tr key={employee.employeeNumber}><td className={portalTdClass}><p className="font-semibold">{getDisplayName(employee.firstName, employee.lastName)}</p><p className="mt-1 text-xs text-dark-grey">{employee.email}</p></td><td className={portalTdClass}>{employee.employeeNumber}</td><td className={`${portalTdClass} capitalize`}>{(rolesByEmployee.get(employee.employeeNumber) ?? []).join(', ') || 'None'}</td><td className={portalTdClass}><PortalStatus value={employee.status} /></td><td className={portalTdClass}><PortalActionButton disabled={employee.employeeNumber === actorEmployeeNumber} tone={employee.status === 'active' ? 'danger' : 'secondary'} className="min-h-9 px-3 text-xs" onClick={() => setPortalEmployeeStatus(employee.employeeNumber, employee.status === 'active' ? 'inactive' : 'active', actorEmployeeNumber ?? '40001')}>{employee.status === 'active' ? 'Deactivate' : 'Activate'}</PortalActionButton></td></tr>)}</tbody></PortalTable>
      </PortalPanel>
    </div>
  );
}
