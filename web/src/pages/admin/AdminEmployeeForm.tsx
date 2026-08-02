import { Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PortalActionButton,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  portalInputClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import { addPortalEmployee, updatePortalEmployee } from '../../services/portalDemoRepository';

export default function AdminEmployeeForm() {
  const { employeeNumber } = useParams();
  const state = usePortalDemo();
  const navigate = useNavigate();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const existing = state.employees.find((employee) => employee.employeeNumber === employeeNumber);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => ({
    employeeNumber: existing?.employeeNumber ?? '',
    firstName: existing?.firstName ?? '',
    lastName: existing?.lastName ?? '',
    email: existing?.email ?? '',
    phoneNumber: existing?.phoneNumber ?? '',
    departmentId: existing?.departmentId ?? state.departments[0]?.id ?? '',
    jobTitle: existing?.jobTitle ?? '',
    workLocation: existing?.workLocation ?? 'Johannesburg Office',
    status: existing?.status ?? 'active' as const,
  }));

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PortalPageHeader title={existing ? 'Edit employee' : 'Add employee'} description="Changes are stored only in the versioned frontend demo repository." />
      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      {saved ? <PortalNotice>Employee saved successfully.</PortalNotice> : null}
      <PortalPanel className="mt-6 p-5 sm:p-6">
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            try {
              if (existing) {
                updatePortalEmployee(existing.employeeNumber, {
                  firstName: form.firstName, lastName: form.lastName, email: form.email,
                  phoneNumber: form.phoneNumber, departmentId: form.departmentId,
                  jobTitle: form.jobTitle, workLocation: form.workLocation,
                }, actorEmployeeNumber ?? '40001');
              } else {
                addPortalEmployee({ ...form, status: 'active' }, actorEmployeeNumber ?? '40001');
              }
              setSaved(true);
              if (!existing) navigate(`/admin/employees/${encodeURIComponent(form.employeeNumber)}`, { replace: true });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Unable to save employee.');
            }
          }}
        >
          <PortalField label="Employee number"><input required disabled={Boolean(existing)} value={form.employeeNumber} onChange={(event) => updateField('employeeNumber', event.target.value.toUpperCase())} className={`${portalInputClass} disabled:bg-light-grey/40`} /></PortalField>
          <PortalField label="Department"><select required value={form.departmentId} onChange={(event) => updateField('departmentId', event.target.value)} className={portalInputClass}>{state.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></PortalField>
          <PortalField label="First name"><input required value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Last name"><input required value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Email"><input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Phone number"><input required value={form.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Job title"><input required value={form.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Work location"><input required value={form.workLocation} onChange={(event) => updateField('workLocation', event.target.value)} className={portalInputClass} /></PortalField>
          <div className="flex flex-wrap gap-3 md:col-span-2 md:justify-end">
            <PortalActionButton tone="secondary" onClick={() => navigate('/admin/employees')}>Cancel</PortalActionButton>
            <PortalActionButton type="submit"><Save className="h-4 w-4" /> Save employee</PortalActionButton>
          </div>
        </form>
      </PortalPanel>
    </div>
  );
}
