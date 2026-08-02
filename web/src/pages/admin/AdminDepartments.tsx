import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import { addPortalDepartment } from '../../services/portalDemoRepository';
import { getDisplayName } from '../../utils/portalFormatters';

export default function AdminDepartments() {
  const state = usePortalDemo();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [manager, setManager] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Departments" description="Maintain the department directory used by employee records and portal filters." />
      <MetricGrid>
        <MetricCard label="Departments" value={state.departments.length} icon={<Building2 className="h-5 w-5" />} />
        <MetricCard label="Employees assigned" value={state.employees.filter((employee) => employee.departmentId).length} icon={<Building2 className="h-5 w-5" />} />
      </MetricGrid>
      {message ? <PortalNotice tone={message.error ? 'error' : 'success'}>{message.text}</PortalNotice> : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PortalPanel>
          <PortalTable>
            <thead><tr><th className={portalThClass}>Department</th><th className={portalThClass}>Code</th><th className={portalThClass}>Manager</th><th className={portalThClass}>Employees</th></tr></thead>
            <tbody>{state.departments.map((department) => {
              const managerEmployee = state.employees.find((employee) => employee.employeeNumber === department.managerEmployeeNumber);
              return <tr key={department.id}><td className={portalTdClass}><span className="font-semibold">{department.name}</span></td><td className={portalTdClass}>{department.code}</td><td className={portalTdClass}>{managerEmployee ? getDisplayName(managerEmployee.firstName, managerEmployee.lastName) : 'Unassigned'}</td><td className={portalTdClass}>{state.employees.filter((employee) => employee.departmentId === department.id).length}</td></tr>;
            })}</tbody>
          </PortalTable>
        </PortalPanel>
        <PortalPanel className="p-5">
          <h2 className="font-bold">Add department</h2>
          <form className="mt-5 space-y-4" onSubmit={(event) => {
            event.preventDefault(); setMessage(null);
            try {
              addPortalDepartment({ name, code, managerEmployeeNumber: manager || null }, actorEmployeeNumber ?? '40001');
              setName(''); setCode(''); setManager(''); setMessage({ text: 'Department added.', error: false });
            } catch (caught) { setMessage({ text: caught instanceof Error ? caught.message : 'Unable to add department.', error: true }); }
          }}>
            <PortalField label="Department name"><input required value={name} onChange={(event) => setName(event.target.value)} className={portalInputClass} /></PortalField>
            <PortalField label="Code"><input required maxLength={6} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className={portalInputClass} /></PortalField>
            <PortalField label="Manager"><select value={manager} onChange={(event) => setManager(event.target.value)} className={portalInputClass}><option value="">Unassigned</option>{state.employees.filter((employee) => employee.status === 'active').map((employee) => <option key={employee.employeeNumber} value={employee.employeeNumber}>{getDisplayName(employee.firstName, employee.lastName)}</option>)}</select></PortalField>
            <PortalActionButton type="submit" className="w-full"><Plus className="h-4 w-4" /> Add department</PortalActionButton>
          </form>
        </PortalPanel>
      </div>
    </div>
  );
}
