import { UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  portalInputClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import type { PortalRole } from '../../navigation/portalNavigation';
import { getEmployeeProfile, type EmployeeDirectoryProfile } from '../../services/employeeApi';
import { ApiError } from '../../services/httpClient';

export default function PortalProfile({ role }: { role: PortalRole }) {
  const { accessToken, email, firstName, lastName, employeeId, employeeNumber } = useSession();
  const [profile, setProfile] = useState<EmployeeDirectoryProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !employeeId) return;
    let active = true;
    void getEmployeeProfile(accessToken)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : 'Profile data could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [accessToken, employeeId]);

  const name = profile?.name ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'User');

  return (
    <div className="mx-auto max-w-3xl">
      <PortalPageHeader
        title={`${role === 'admin' ? 'Admin' : 'HR'} profile`}
        description="Profile information loaded from the authenticated account and linked employee record."
      />
      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      <PortalPanel className="mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-light-grey pb-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-light-grey"><UserCircle className="h-9 w-9 text-dark-grey" /></span>
          <div><h2 className="text-xl font-bold">{name}</h2><p className="mt-1 text-sm text-dark-grey">{role === 'admin' ? 'System Administrator' : 'HR Officer'}{employeeNumber ? ` · ${employeeNumber}` : ''}</p></div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <PortalField label="Email"><input readOnly value={profile?.email ?? email ?? '—'} className={`${portalInputClass} bg-light-grey/40`} /></PortalField>
          <PortalField label="Phone number"><input readOnly value={profile?.phone ?? '—'} className={`${portalInputClass} bg-light-grey/40`} /></PortalField>
          <PortalField label="Department"><input readOnly value={profile?.department ?? 'Not linked to an employee record'} className={`${portalInputClass} bg-light-grey/40`} /></PortalField>
          <PortalField label="Employee number"><input readOnly value={profile?.staffNumber ?? employeeNumber ?? 'Not linked'} className={`${portalInputClass} bg-light-grey/40`} /></PortalField>
        </div>
        <p className="mt-5 text-xs leading-5 text-dark-grey">Contact-detail editing is not shown because the backend does not currently expose a profile update endpoint. This avoids displaying changes that are not stored in PostgreSQL.</p>
      </PortalPanel>
    </div>
  );
}
