import { CalendarCheck2, Download, Search, UserCheck } from 'lucide-react';
import { useState } from 'react';
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
import { usePortalDemo } from '../../hooks/usePortalDemo';
import { downloadCsv, formatDuration, formatPortalTime, getDisplayName } from '../../utils/portalFormatters';

export default function HrAttendance() {
  const state = usePortalDemo();
  const dates = state.attendance.map((record) => record.workDate).sort();
  const [date, setDate] = useState(dates[dates.length - 1] ?? '');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const employees = new Map(state.employees.map((employee) => [employee.employeeNumber, employee]));
  const normalized = query.toLowerCase().trim();
  const records = state.attendance.filter((record) => {
    const employee = employees.get(record.employeeNumber);
    const matchesQuery = !normalized || `${record.employeeNumber} ${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.toLowerCase().includes(normalized);
    return record.workDate === date && (status === 'all' || record.status === status) && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Attendance" description="Review the shared frontend demo attendance records by date, employee, and status." actions={<PortalActionButton tone="secondary" onClick={() => downloadCsv(`attendance-${date}.csv`, ['Employee', 'Employee No.', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Verification'], records.map((record) => { const employee = employees.get(record.employeeNumber); return [employee ? getDisplayName(employee.firstName, employee.lastName) : record.employeeNumber, record.employeeNumber, record.workDate, formatPortalTime(record.clockIn), formatPortalTime(record.clockOut), formatDuration(record.durationMinutes), record.status, record.verificationResult]; }))}><Download className="h-4 w-4" /> Export CSV</PortalActionButton>} />
      <MetricGrid>
        <MetricCard label="Present" value={state.attendance.filter((item) => item.workDate === date && item.status === 'present').length} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Late" value={state.attendance.filter((item) => item.workDate === date && item.status === 'late').length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Absent" value={state.attendance.filter((item) => item.workDate === date && item.status === 'absent').length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="red" />
        <MetricCard label="Incomplete" value={state.attendance.filter((item) => item.workDate === date && item.status === 'incomplete').length} icon={<CalendarCheck2 className="h-5 w-5" />} />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 md:grid-cols-[180px_200px_minmax(220px,1fr)]"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={portalInputClass} aria-label="Attendance date" /><select value={status} onChange={(event) => setStatus(event.target.value)} className={portalInputClass} aria-label="Attendance status"><option value="all">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select><label className="relative"><span className="sr-only">Search attendance employees</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${portalInputClass} pl-11`} placeholder="Search employee" /></label></div>
        {records.length === 0 ? <PortalEmptyState>No attendance records match these filters.</PortalEmptyState> : <PortalTable><thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Employee No.</th><th className={portalThClass}>Date</th><th className={portalThClass}>Clock In</th><th className={portalThClass}>Clock Out</th><th className={portalThClass}>Duration</th><th className={portalThClass}>Status</th><th className={portalThClass}>Verification</th></tr></thead><tbody>{records.map((record) => { const employee = employees.get(record.employeeNumber); return <tr key={record.id}><td className={`${portalTdClass} font-semibold`}>{employee ? getDisplayName(employee.firstName, employee.lastName) : record.employeeNumber}</td><td className={portalTdClass}>{record.employeeNumber}</td><td className={portalTdClass}>{record.workDate}</td><td className={portalTdClass}>{formatPortalTime(record.clockIn)}</td><td className={portalTdClass}>{formatPortalTime(record.clockOut)}</td><td className={portalTdClass}>{formatDuration(record.durationMinutes)}</td><td className={portalTdClass}><PortalStatus value={record.status} /></td><td className={portalTdClass}><PortalStatus value={record.verificationResult} /></td></tr>; })}</tbody></PortalTable>}
      </PortalPanel>
    </div>
  );
}
