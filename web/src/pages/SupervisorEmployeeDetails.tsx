import { CalendarDays, CircleAlert, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import type { AttendanceRecord } from '../services/attendanceApi';
import { getAdminEmployees, type AdminEmployeeResponse } from '../services/adminEmployeesApi';
import {
  buildAttendanceDayRows,
  formatAttendanceTime,
  getOrganisationAttendanceEvents,
  type AttendanceDayRow,
} from '../services/organisationAttendanceApi';
import { getWorkLocations } from '../services/workLocationsApi';
import { formatAttendanceRange, type AttendanceRange } from '../utils/attendanceRanges';
import { formatDurationMinutes } from '../utils/attendanceDuration';
import { exportAttendanceHistoryPdf } from '../utils/pdfExports';

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function getRouteRange(from: string | null, to: string | null): AttendanceRange | null {
  if (!from || !to || !isValidIsoDate(from) || !isValidIsoDate(to) || from > to) return null;
  return { from, to };
}

function toHistoryRecord(row: AttendanceDayRow): AttendanceRecord {
  const date = new Date(`${row.workDate}T12:00:00Z`);
  return {
    date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: row.timeZoneId }).format(date),
    day: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: row.timeZoneId }).format(date),
    timeIn: formatAttendanceTime(row.clockInAtUtc, row.timeZoneId),
    timeOut: formatAttendanceTime(row.clockOutAtUtc, row.timeZoneId),
    status: 'present',
    hours: row.workedDuration,
  };
}

export default function SupervisorEmployeeDetails() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const { accessToken } = useSession();
  const range = useMemo(() => getRouteRange(searchParams.get('from'), searchParams.get('to')), [searchParams]);
  const [employee, setEmployee] = useState<AdminEmployeeResponse | null>(null);
  const [rows, setRows] = useState<AttendanceDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const backTo = range ? `/supervisor/team-attendance?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : '/supervisor/team-attendance';

  useEffect(() => {
    if (!accessToken || !employeeId || !range) {
      setError('A valid employee and date range are required.');
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [employees, locations, events] = await Promise.all([
          getAdminEmployees(accessToken!),
          getWorkLocations(accessToken!),
          getOrganisationAttendanceEvents(accessToken!, range!, employeeId),
        ]);
        if (!active) return;
        const selected = employees.find((item) => item.id === employeeId) ?? null;
        if (!selected) {
          setError('The employee was not found in the database.');
          return;
        }
        setEmployee(selected);
        setRows(buildAttendanceDayRows(events, employees, locations, range!).filter((row) => row.employeeId === employeeId));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Employee attendance could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [accessToken, employeeId, range]);

  const workedMinutes = rows.reduce((total, row) => total + row.workedDurationMinutes, 0);
  const completedDays = rows.filter((row) => row.status === 'Completed').length;
  const openOrInvalidDays = rows.length - completedDays;

  async function handleExport() {
    if (!employee || !range || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportAttendanceHistoryPdf({
        staffNumber: employee.employeeNumber,
        range,
        rangeLabel: formatAttendanceRange(range),
        summary: {
          daysPresent: rows.length,
          daysAbsent: 0,
          totalHours: formatDurationMinutes(workedMinutes),
          calculationNote: 'Only recorded attendance sessions are included. Absence requires approved schedule and leave data.',
        },
        records: rows.map(toHistoryRecord),
      });
    } catch {
      setExportError('The attendance PDF could not be exported.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Employee Details" backTo={backTo} />
      {loading ? <p className="mt-6 text-center text-xs text-dark-grey">Loading employee attendance…</p> : null}
      {error ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{error}</NoticeBanner> : null}
      {!loading && !error && employee && range ? (
        <>
          <div className="mt-4"><p className="text-[10px] text-dark-grey">Employee</p><h2 className="mt-1 text-base font-semibold">{employee.fullName} ({employee.employeeNumber})</h2><p className="mt-1 text-[10px] text-dark-grey">{employee.departmentName} · {employee.workLocationName}</p></div>
          <div className="mt-4 flex h-[52px] items-center gap-3 rounded-card border border-light-grey bg-white px-4 text-xs"><CalendarDays className="h-5 w-5" /> {formatAttendanceRange(range)}</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-card bg-status-green-soft px-2 py-4 text-center"><p className="text-[9px] text-dark-grey">Recorded Days</p><p className="mt-2 text-xl font-semibold text-status-green">{rows.length}</p></div>
            <div className="rounded-card bg-white px-2 py-4 text-center shadow-sm"><p className="text-[9px] text-dark-grey">Completed</p><p className="mt-2 text-xl font-semibold">{completedDays}</p></div>
            <div className="rounded-card bg-status-red-soft px-2 py-4 text-center"><p className="text-[9px] text-dark-grey">Open / Invalid</p><p className="mt-2 text-xl font-semibold text-status-red">{openOrInvalidDays}</p></div>
          </div>
          {exportError ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{exportError}</NoticeBanner> : null}
          <div className="mt-4 overflow-hidden rounded-card border border-light-grey bg-white shadow-sm">
            <table className="w-full table-fixed text-[10px]"><thead className="bg-black text-white"><tr>{['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((heading) => <th key={heading} className="px-2 py-3 text-left font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-light-grey">{rows.length > 0 ? rows.map((row) => <tr key={row.id}><td className="px-2 py-2.5 font-semibold">{row.workDate}</td><td className="px-2 py-2.5">{formatAttendanceTime(row.clockInAtUtc, row.timeZoneId)}</td><td className="px-2 py-2.5">{formatAttendanceTime(row.clockOutAtUtc, row.timeZoneId)}</td><td className="px-2 py-2.5">{row.workedDuration}</td><td className="px-2 py-2.5">{row.status}</td></tr>) : <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-dark-grey">No attendance records were found for this range.</td></tr>}</tbody></table>
          </div>
          <div className="pb-2 pt-4"><Button onClick={() => void handleExport()} disabled={exporting || rows.length === 0} className="inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"><FileText className="h-5 w-5" />{exporting ? 'EXPORTING…' : 'EXPORT PDF'}</Button></div>
        </>
      ) : null}
    </AppShell>
  );
}
