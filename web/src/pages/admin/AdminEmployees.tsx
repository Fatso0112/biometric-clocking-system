import { Pencil, Plus, Search, UserCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
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

export default function AdminEmployees() {
  const state = usePortalDemo();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('all');
  const [status, setStatus] = useState('all');
  const departmentNames = new Map(state.departments.map((department) => [department.id, department.name]));
  const rolesByEmployee = useMemo(() => {
    const roles = new Map<string, string[]>();
    for (const assignment of state.roleAssignments) {
      if (!assignment.active) continue;
      roles.set(assignment.employeeNumber, [...(roles.get(assignment.employeeNumber) ?? []), assignment.role]);
    }
    return roles;
  }, [state.roleAssignments]);
  const normalizedQuery = query.trim().toLowerCase();
  const employees = state.employees.filter((employee) => {
    const matchesQuery = !normalizedQuery || [
      employee.employeeNumber,
      employee.firstName,
      employee.lastName,
      employee.email,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery &&
      (departmentId === 'all' || employee.departmentId === departmentId) &&
      (status === 'all' || employee.status === status);
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Employees"
        description="Search, add, edit, activate, or deactivate people in the shared frontend demo repository."
        actions={(
          <Link to="/admin/employees/new" className="inline-flex min-h-11 items-center gap-2 rounded-card bg-black px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add employee
          </Link>
        )}
      />
      <MetricGrid>
        <MetricCard label="Total employees" value={state.employees.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Active" value={state.employees.filter((item) => item.status === 'active').length} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Departments" value={state.departments.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Filtered results" value={employees.length} icon={<Search className="h-5 w-5" />} />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 md:grid-cols-[minmax(240px,1fr)_220px_180px]">
          <label className="relative">
            <span className="sr-only">Search employees</span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, employee no. or email" className={`${portalInputClass} pl-11`} />
          </label>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className={portalInputClass} aria-label="Filter by department">
            <option value="all">All departments</option>
            {state.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={portalInputClass} aria-label="Filter by status">
            <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        {employees.length === 0 ? <PortalEmptyState>No employees match these filters.</PortalEmptyState> : (
          <PortalTable>
            <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Employee No.</th><th className={portalThClass}>Department</th><th className={portalThClass}>Roles</th><th className={portalThClass}>Status</th><th className={portalThClass}>Actions</th></tr></thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.employeeNumber}>
                  <td className={portalTdClass}><p className="font-semibold">{getDisplayName(employee.firstName, employee.lastName)}</p><p className="mt-1 text-xs text-dark-grey">{employee.email}</p></td>
                  <td className={portalTdClass}>{employee.employeeNumber}</td>
                  <td className={portalTdClass}>{departmentNames.get(employee.departmentId) ?? 'Unassigned'}</td>
                  <td className={portalTdClass}><span className="capitalize">{(rolesByEmployee.get(employee.employeeNumber) ?? []).join(', ') || 'None'}</span></td>
                  <td className={portalTdClass}><PortalStatus value={employee.status} /></td>
                  <td className={portalTdClass}>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/employees/${encodeURIComponent(employee.employeeNumber)}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-light-grey" aria-label={`Edit ${getDisplayName(employee.firstName, employee.lastName)}`}><Pencil className="h-4 w-4" /></Link>
                      <PortalActionButton
                        tone={employee.status === 'active' ? 'danger' : 'secondary'}
                        className="min-h-10 px-3 text-xs"
                        onClick={() => setPortalEmployeeStatus(employee.employeeNumber, employee.status === 'active' ? 'inactive' : 'active', actorEmployeeNumber ?? '40001')}
                      >
                        {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                      </PortalActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}
