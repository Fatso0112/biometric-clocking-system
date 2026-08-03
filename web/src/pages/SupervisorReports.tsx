import { CalendarDays, CircleAlert, FileText, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import { getAdminEmployees } from '../services/adminEmployeesApi';
import {
  aggregateAttendanceByEmployee,
  buildAttendanceDayRows,
  getOrganisationAttendanceEvents,
  type EmployeeAttendanceAggregate,
} from '../services/organisationAttendanceApi';
import { getWorkLocations } from '../services/workLocationsApi';
import { formatAttendanceRange, getAttendanceRangeOptions, type AttendanceRange } from '../utils/attendanceRanges';
import { exportTeamAttendanceReportPdf } from '../utils/pdfExports';

export default function SupervisorReports() {
  const { accessToken } = useSession();
  const initialRange = getAttendanceRangeOptions()[0];
  const [range, setRange] = useState<AttendanceRange>({ from: initialRange.from, to: initialRange.to });
  const [rows, setRows] = useState<EmployeeAttendanceAggregate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async () => {
    if (!accessToken || !range.from || !range.to || range.from > range.to) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [employees, locations, events] = await Promise.all([
        getAdminEmployees(accessToken),
        getWorkLocations(accessToken),
        getOrganisationAttendanceEvents(accessToken, range),
      ]);
      setRows(aggregateAttendanceByEmployee(employees, buildAttendanceDayRows(events, employees, locations, range)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Attendance report data is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, range]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function handleDownload() {
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportTeamAttendanceReportPdf({
        range,
        rangeLabel: formatAttendanceRange(range),
        summary: {
          totalMembers: rows.length,
          recordedDays: rows.reduce((total, row) => total + row.recordedDays, 0),
          completedDays: rows.reduce((total, row) => total + row.completedDays, 0),
          exceptionDays: rows.reduce((total, row) => total + row.openDays + row.invalidDays, 0),
        },
        rows,
      });
    } catch {
      setExportError('The attendance report could not be downloaded.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Attendance Report" backTo="/supervisor/dashboard" />
      <section className="mt-4"><div className="flex items-center gap-2 text-xs font-semibold"><FileText className="h-5 w-5" /> Database Attendance Report</div></section>
      <section className="mt-4 rounded-card border border-light-grey bg-white p-3">
        <div className="flex items-center gap-2 text-xs font-semibold"><CalendarDays className="h-4 w-4" /> {formatAttendanceRange(range)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2"><input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} className="h-10 rounded-card border border-light-grey px-2 text-xs" aria-label="Report start date" /><input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} className="h-10 rounded-card border border-light-grey px-2 text-xs" aria-label="Report end date" /></div>
        <button type="button" onClick={() => void loadReport()} disabled={loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-card border border-light-grey px-3 text-xs font-semibold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </section>
      <section className="mt-5"><h2 className="text-sm font-semibold">Report Summary</h2><div className="mt-2 grid grid-cols-3 gap-3"><div className="rounded-card bg-white px-2 py-4 text-center shadow-sm"><p className="text-[10px] text-dark-grey">Employees</p><p className="mt-2 text-xl font-semibold">{loading ? '—' : rows.length}</p></div><div className="rounded-card bg-status-green-soft px-2 py-4 text-center"><p className="text-[10px] text-dark-grey">Completed Days</p><p className="mt-2 text-xl font-semibold text-status-green">{loading ? '—' : rows.reduce((total, row) => total + row.completedDays, 0)}</p></div><div className="rounded-card bg-status-red-soft px-2 py-4 text-center"><p className="text-[10px] text-dark-grey">Open / Invalid</p><p className="mt-2 text-xl font-semibold text-status-red">{loading ? '—' : rows.reduce((total, row) => total + row.openDays + row.invalidDays, 0)}</p></div></div></section>
      {loadError ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{loadError}</NoticeBanner> : null}
      {exportError ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{exportError}</NoticeBanner> : null}
      <div className="pt-8"><Button onClick={() => void handleDownload()} disabled={rows.length === 0 || exporting} className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none">{exporting ? 'DOWNLOADING…' : 'DOWNLOAD REPORT'}</Button></div>
      <p className="pt-4 text-[10px] leading-4 text-dark-grey">This report includes only attendance events stored in the database. Absence and lateness require schedule and leave data that are not yet modelled.</p>
    </AppShell>
  );
}
