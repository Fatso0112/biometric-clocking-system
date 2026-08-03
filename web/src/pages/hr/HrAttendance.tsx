import { CalendarCheck2, Download, RefreshCw, Search, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { getAdminEmployees, type AdminEmployeeResponse } from '../../services/adminEmployeesApi';
import { ApiError } from '../../services/httpClient';
import {
  buildAttendanceDayRows,
  formatAttendanceTime,
  getOrganisationAttendanceEvents,
  type AttendanceDayRow,
} from '../../services/organisationAttendanceApi';
import { getWorkLocations } from '../../services/workLocationsApi';
import { downloadCsv } from '../../utils/portalFormatters';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Attendance data could not be loaded.';
}

export default function HrAttendance() {
  const { accessToken } = useSession();
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<AdminEmployeeResponse[]>([]);
  const [rows, setRows] = useState<AttendanceDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [employeeData, locationData, events] = await Promise.all([
        getAdminEmployees(accessToken),
        getWorkLocations(accessToken),
        getOrganisationAttendanceEvents(accessToken, { from: date, to: date }),
      ]);
      setEmployees(employeeData);
      setRows(buildAttendanceDayRows(events, employeeData, locationData, { from: date, to: date }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, date]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const normalized = query.toLowerCase().trim();
  const filteredRows = useMemo(
    () => rows.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status;
      const matchesQuery = !normalized ||
        `${row.employeeNumber} ${row.employeeName} ${row.departmentName}`
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesQuery;
    }),
    [normalized, rows, status],
  );

  const employeesWithRecords = new Set(rows.map((row) => row.employeeId)).size;
  const activeEmployees = employees.filter((employee) => employee.isActive).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Attendance"
        description="Review attendance sessions calculated from events stored in PostgreSQL."
        actions={
          <div className="flex flex-wrap gap-2">
            <PortalActionButton tone="secondary" onClick={() => downloadCsv(
              `attendance-${date}.csv`,
              ['Employee', 'Employee No.', 'Date', 'Clock In', 'Clock Out', 'Worked', 'Status', 'Verification'],
              filteredRows.map((row) => [
                row.employeeName,
                row.employeeNumber,
                row.workDate,
                formatAttendanceTime(row.clockInAtUtc, row.timeZoneId),
                formatAttendanceTime(row.clockOutAtUtc, row.timeZoneId),
                row.workedDuration,
                row.status,
                row.verificationMethods.join(', '),
              ]),
            )} disabled={filteredRows.length === 0}><Download className="h-4 w-4" /> Export CSV</PortalActionButton>
            <PortalActionButton tone="secondary" onClick={() => void loadAttendance()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</PortalActionButton>
          </div>
        }
      />
      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      <MetricGrid>
        <MetricCard label="Active employees" value={loading ? '—' : activeEmployees} icon={<UserCheck className="h-5 w-5" />} />
        <MetricCard label="Employees with records" value={loading ? '—' : employeesWithRecords} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Completed" value={loading ? '—' : rows.filter((row) => row.status === 'Completed').length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="green" />
        <MetricCard label="Open or invalid" value={loading ? '—' : rows.filter((row) => row.status !== 'Completed').length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="amber" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 md:grid-cols-[180px_220px_minmax(220px,1fr)]">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={portalInputClass} aria-label="Attendance date" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={portalInputClass} aria-label="Attendance status">
            <option value="all">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Working">Working</option>
            <option value="OnBreak">On break</option>
            <option value="Incomplete">Incomplete</option>
            <option value="InvalidSequence">Invalid sequence</option>
          </select>
          <label className="relative"><span className="sr-only">Search employees</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${portalInputClass} pl-11`} placeholder="Search employee" /></label>
        </div>
        {filteredRows.length === 0 ? (
          <PortalEmptyState>{loading ? 'Loading attendance…' : 'No database attendance records match these filters.'}</PortalEmptyState>
        ) : (
          <PortalTable>
            <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Department</th><th className={portalThClass}>Clock In</th><th className={portalThClass}>Clock Out</th><th className={portalThClass}>Worked</th><th className={portalThClass}>Status</th><th className={portalThClass}>Verification</th></tr></thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className={portalTdClass}><p className="font-semibold">{row.employeeName}</p><p className="mt-1 text-xs text-dark-grey">{row.employeeNumber}</p></td>
                  <td className={portalTdClass}>{row.departmentName}</td>
                  <td className={portalTdClass}>{formatAttendanceTime(row.clockInAtUtc, row.timeZoneId)}</td>
                  <td className={portalTdClass}>{formatAttendanceTime(row.clockOutAtUtc, row.timeZoneId)}</td>
                  <td className={portalTdClass}>{row.workedDuration}</td>
                  <td className={portalTdClass}><PortalStatus value={row.status} /></td>
                  <td className={portalTdClass}>{row.verificationMethods.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}
