import { ClipboardList, Download, Search } from 'lucide-react';
import { useState } from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalPageHeader,
  PortalPanel,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import { downloadCsv, formatPortalDate } from '../../utils/portalFormatters';

export default function AdminAuditLogs() {
  const state = usePortalDemo();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const events = state.auditEvents.filter((event) => !normalized || `${event.action} ${event.target} ${event.actorEmployeeNumber} ${event.detail}`.toLowerCase().includes(normalized));
  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Audit logs" description="Frontend demo audit events for employee, role, team, payroll, and settings changes." actions={<PortalActionButton tone="secondary" onClick={() => downloadCsv('audit-log.csv', ['Timestamp', 'Actor', 'Action', 'Target', 'Detail'], events.map((event) => [event.occurredAt, event.actorEmployeeNumber, event.action, event.target, event.detail]))}><Download className="h-4 w-4" /> Export CSV</PortalActionButton>} />
      <MetricGrid><MetricCard label="Recorded events" value={state.auditEvents.length} icon={<ClipboardList className="h-5 w-5" />} /><MetricCard label="Visible results" value={events.length} icon={<Search className="h-5 w-5" />} /></MetricGrid>
      <PortalPanel className="mt-6"><div className="border-b border-light-grey p-4"><label className="relative block max-w-lg"><span className="sr-only">Search audit logs</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${portalInputClass} pl-11`} placeholder="Search action, target or actor" /></label></div><PortalTable><thead><tr><th className={portalThClass}>Time</th><th className={portalThClass}>Action</th><th className={portalThClass}>Target</th><th className={portalThClass}>Actor</th><th className={portalThClass}>Detail</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td className={portalTdClass}><p>{formatPortalDate(event.occurredAt)}</p><p className="mt-1 text-xs text-dark-grey">{new Date(event.occurredAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p></td><td className={`${portalTdClass} font-semibold`}>{event.action}</td><td className={portalTdClass}>{event.target}</td><td className={portalTdClass}>{event.actorEmployeeNumber}</td><td className={`${portalTdClass} max-w-sm text-dark-grey`}>{event.detail}</td></tr>)}</tbody></PortalTable></PortalPanel>
    </div>
  );
}
