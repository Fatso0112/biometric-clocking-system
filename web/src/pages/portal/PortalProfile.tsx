import { Save, UserCircle } from 'lucide-react';
import { useState } from 'react';
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
import type { PortalRole } from '../../navigation/portalNavigation';
import { updatePortalEmployee } from '../../services/portalDemoRepository';

export default function PortalProfile({ role }: { role: PortalRole }) {
  const state = usePortalDemo();
  const { employeeNumber } = useSession();
  const employee = state.employees.find((candidate) => candidate.employeeNumber === employeeNumber);
  const [email, setEmail] = useState(employee?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(employee?.phoneNumber ?? '');
  const [message, setMessage] = useState<string | null>(null);
  if (!employee) return <PortalNotice tone="error">Profile record not found.</PortalNotice>;
  return (
    <div className="mx-auto max-w-3xl">
      <PortalPageHeader title={`${role === 'admin' ? 'Admin' : 'HR'} profile`} description="Update contact information in the shared frontend demo employee record." />
      {message ? <PortalNotice>{message}</PortalNotice> : null}
      <PortalPanel className="mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-light-grey pb-5"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-light-grey"><UserCircle className="h-9 w-9 text-dark-grey" /></span><div><h2 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h2><p className="mt-1 text-sm text-dark-grey">{employee.jobTitle} · {employee.employeeNumber}</p></div></div>
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); updatePortalEmployee(employee.employeeNumber, { email, phoneNumber }, employee.employeeNumber); setMessage('Profile updated.'); }}>
          <PortalField label="Email"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Phone number"><input required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className={portalInputClass} /></PortalField>
          <div className="sm:col-span-2 sm:justify-self-end"><PortalActionButton type="submit"><Save className="h-4 w-4" /> Save profile</PortalActionButton></div>
        </form>
      </PortalPanel>
    </div>
  );
}
