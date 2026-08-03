import { CircleAlert, FileText, List, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import RoleSwitcher from '../components/RoleSwitcher';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { useSession } from '../context/SessionContext';
import { useLogout } from '../hooks/useLogout';
import {
  getAttendanceDashboard,
  type AttendanceDashboardResponse,
} from '../services/organisationAttendanceApi';

function OverviewCard({ label, value, tone = 'plain' }: { label: string; value: number | null; tone?: 'plain' | 'present' | 'absent' }) {
  const toneClasses = {
    plain: '',
    present: 'bg-status-green-soft text-status-green',
    absent: 'bg-status-red-soft text-status-red',
  }[tone];

  return (
    <div className={`flex min-h-[84px] flex-col items-center justify-center rounded-card px-2 py-3 ${toneClasses}`}>
      <span className="text-[11px] text-dark-grey">{label}</span>
      <strong className={`mt-2 text-xl font-semibold ${tone === 'plain' ? 'text-black' : ''}`}>{value ?? '—'}</strong>
    </div>
  );
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { profile } = useEmployeeProfile();
  const { accessToken } = useSession();
  const [overview, setOverview] = useState<AttendanceDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void getAttendanceDashboard(accessToken)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Workforce overview is unavailable.');
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <AppShell>
      <header className="flex items-start gap-3 py-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-light-grey/70">
          {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.name} profile photo`} className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-dark-grey" strokeWidth={1.5} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 pt-0.5"><p className="text-xs text-dark-grey">Welcome,</p><h1 className="truncate text-lg font-semibold leading-tight">{profile?.name ?? 'Loading…'}</h1><p className="mt-2 text-[11px] font-medium text-black">Department: {profile?.department ?? '—'}</p></div>
        <RoleSwitcher compact />
        <button type="button" onClick={() => logout()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black hover:bg-light-grey/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black" aria-label="Log out"><LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /></button>
      </header>

      <section className="mt-5" aria-labelledby="workforce-overview-title" data-generated-at={overview?.generatedAtUtc}>
        <h2 id="workforce-overview-title" className="text-sm font-semibold">Live Workforce Overview</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <OverviewCard label="Registered" value={overview?.registeredEmployees ?? null} />
          <OverviewCard label="Working" value={overview?.currentlyWorking ?? null} tone="present" />
          <OverviewCard label="On Break" value={overview?.onBreak ?? null} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <OverviewCard label="Not Present" value={overview?.notPresent ?? null} />
          <OverviewCard label="Missing Clock-out" value={overview?.missingClockOut ?? null} tone="absent" />
        </div>
      </section>

      {loadError ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{loadError}</NoticeBanner> : null}

      <nav className="mt-5 space-y-4" aria-label="Supervisor sections">
        <ListItem icon={<List className="h-7 w-7" strokeWidth={1.5} />} title="EMPLOYEE ATTENDANCE" subtitle="View database attendance records" onClick={() => navigate('/supervisor/team-attendance')} />
        <ListItem icon={<FileText className="h-7 w-7" strokeWidth={1.5} />} title="ATTENDANCE REPORTS" subtitle="View and download database reports" onClick={() => navigate('/supervisor/reports')} />
      </nav>
    </AppShell>
  );
}
