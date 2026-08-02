import { Download, FileBarChart, UserCheck, UsersRound } from 'lucide-react';
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
import { usePortalDemo } from '../../hooks/usePortalDemo';
import type { PortalRole } from '../../navigation/portalNavigation';
import { downloadCsv, formatDuration, getDisplayName } from '../../utils/portalFormatters';

export default function PortalReports({ role }: { role: PortalRole }) {
  const state = usePortalDemo();
  const dates = state.attendance.map((record) => record.workDate).sort();
  const [from, setFrom] = useState(dates[0] ?? '');
  const [to, setTo] = useState(dates[dates.length - 1] ?? '');
  const [employeeNumber, setEmployeeNumber] = useState('all');
  const employees = new Map(state.employees.map((employee) => [employee.employeeNumber, employee]));
  const records = state.attendance.filter((record) =>
    record.workDate >= from && record.workDate <= to &&
    (employeeNumber === 'all' || record.employeeNumber === employeeNumber),
  );
  const rows = useMemo(() => {
    const grouped = new Map<string, typeof records>();
    for (const record of records) grouped.set(record.employeeNumber, [...(grouped.get(record.employeeNumber) ?? []), record]);
    return [...grouped.entries()].map(([number, items]) => ({
      employeeNumber: number,
      total: items.length,
      present: items.filter((item) => item.status === 'present').length,
      late: items.filter((item) => item.status === 'late').length,
      absent: items.filter((item) => item.status === 'absent').length,
      durationMinutes: items.reduce((total, item) => total + (item.durationMinutes ?? 0), 0),
    }));
  }, [records]);

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Reports" description={`${role === 'admin' ? 'Administrative' : 'HR'} attendance reporting from the shared frontend demo repository.`} actions={<PortalActionButton tone="secondary" onClick={() => downloadCsv(`${role}-attendance-report.csv`, ['Employee No.', 'Records', 'Present', 'Late', 'Absent', 'Minutes'], rows.map((row) => [row.employeeNumber, row.total, row.present, row.late, row.absent, row.durationMinutes]))}><Download className="h-4 w-4" /> Export CSV</PortalActionButton>} />
      <MetricGrid>
        <MetricCard label="Report records" value={records.length} icon={<FileBarChart className="h-5 w-5" />} />
        <MetricCard label="Employees" value={rows.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Present" value={records.filter((item) => item.status === 'present').length} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Exceptions" value={records.filter((item) => item.status !== 'present').length} icon={<FileBarChart className="h-5 w-5" />} tone="amber" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 sm:grid-cols-3"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={portalInputClass} aria-label="Report start date" /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={portalInputClass} aria-label="Report end date" /><select value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} className={portalInputClass} aria-label="Filter report by employee"><option value="all">All employees</option>{state.employees.map((employee) => <option key={employee.employeeNumber} value={employee.employeeNumber}>{getDisplayName(employee.firstName, employee.lastName)}</option>)}</select></div>
        <PortalTable><thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Records</th><th className={portalThClass}>Present</th><th className={portalThClass}>Late</th><th className={portalThClass}>Absent</th><th className={portalThClass}>Total hours</th><th className={portalThClass}>Status</th></tr></thead><tbody>{rows.map((row) => { const employee = employees.get(row.employeeNumber); return <tr key={row.employeeNumber}><td className={portalTdClass}><p className="font-semibold">{employee ? getDisplayName(employee.firstName, employee.lastName) : row.employeeNumber}</p><p className="mt-1 text-xs text-dark-grey">{row.employeeNumber}</p></td><td className={portalTdClass}>{row.total}</td><td className={portalTdClass}>{row.present}</td><td className={portalTdClass}>{row.late}</td><td className={portalTdClass}>{row.absent}</td><td className={portalTdClass}>{formatDuration(row.durationMinutes)}</td><td className={portalTdClass}><PortalStatus value={row.absent > 0 || row.late > 1 ? 'review' : 'good'} /></td></tr>; })}</tbody></PortalTable>
      </PortalPanel>
    </div>
  );
}
