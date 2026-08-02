import { RotateCcw, Save } from 'lucide-react';
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
import { getPortalDemoSnapshot, resetPortalDemo, updatePortalSettings } from '../../services/portalDemoRepository';

export default function PortalSettings({ role }: { role: PortalRole }) {
  const state = usePortalDemo();
  const { employeeNumber } = useSession();
  const [form, setForm] = useState(state.settings);
  const [message, setMessage] = useState<string | null>(null);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="mx-auto max-w-4xl">
      <PortalPageHeader title="Settings" description="Organization settings persist only in this browser's versioned frontend demo store." />
      {message ? <PortalNotice>{message}</PortalNotice> : null}
      <PortalPanel className="mt-6 p-5 sm:p-6">
        <form className="grid gap-5 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); updatePortalSettings(form, employeeNumber ?? (role === 'admin' ? '40001' : '30001')); setMessage('Settings saved.'); }}>
          <PortalField label="Organization name"><input required value={form.organizationName} onChange={(event) => update('organizationName', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Timezone"><select value={form.timezone} onChange={(event) => update('timezone', event.target.value)} className={portalInputClass}><option value="Africa/Johannesburg">Africa/Johannesburg</option><option value="UTC">UTC</option></select></PortalField>
          <PortalField label="Standard start"><input type="time" value={form.standardStartTime} onChange={(event) => update('standardStartTime', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Standard end"><input type="time" value={form.standardEndTime} onChange={(event) => update('standardEndTime', event.target.value)} className={portalInputClass} /></PortalField>
          <PortalField label="Late grace period (minutes)"><input type="number" min="0" max="120" value={form.lateGraceMinutes} onChange={(event) => update('lateGraceMinutes', Number(event.target.value))} className={portalInputClass} /></PortalField>
          <div className="space-y-3 rounded-card border border-light-grey p-4">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.requireBiometricVerification} onChange={(event) => update('requireBiometricVerification', event.target.checked)} className="h-4 w-4" /> Require biometric verification</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.emailNotifications} onChange={(event) => update('emailNotifications', event.target.checked)} className="h-4 w-4" /> Email notifications</label>
          </div>
          <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
            {role === 'admin' ? <PortalActionButton tone="danger" onClick={() => { resetPortalDemo(); setForm(getPortalDemoSnapshot().settings); setMessage('Frontend demo data reset. Sign in again to refresh role state.'); }}><RotateCcw className="h-4 w-4" /> Reset demo data</PortalActionButton> : null}
            <PortalActionButton type="submit"><Save className="h-4 w-4" /> Save settings</PortalActionButton>
          </div>
        </form>
      </PortalPanel>
    </div>
  );
}
