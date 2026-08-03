import { CalendarDays, CircleAlert, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import { getAdminEmployees, type AdminEmployeeResponse } from '../services/adminEmployeesApi';
import {
  aggregateAttendanceByEmployee,
  buildAttendanceDayRows,
  getOrganisationAttendanceEvents,
  type EmployeeAttendanceAggregate,
} from '../services/organisationAttendanceApi';
import { getWorkLocations } from '../services/workLocationsApi';
import { formatAttendanceRange, getAttendanceRangeOptions, type AttendanceRange } from '../utils/attendanceRanges';

export default function SupervisorTeamAttendance() {
  const navigate = useNavigate();
  const { accessToken } = useSession();
  const initialRange = getAttendanceRangeOptions()[0];
  const [range, setRange] = useState<AttendanceRange>({ from: initialRange.from, to: initialRange.to });
  const [employees, setEmployees] = useState<AdminEmployeeResponse[]>([]);
  const [rows, setRows] = useState<EmployeeAttendanceAggregate[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    if (!accessToken || !range.from || !range.to || range.from > range.to) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [employeeData, locationData, events] = await Promise.all([
        getAdminEmployees(accessToken),
        getWorkLocations(accessToken),
        getOrganisationAttendanceEvents(accessToken, range),
      ]);
      const dayRows = buildAttendanceDayRows(events, employeeData, locationData, range);
      setEmployees(employeeData);
      setRows(aggregateAttendanceByEmployee(employeeData, dayRows));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Employee attendance is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, range]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const selectedExists = useMemo(
    () => rows.some((row) => row.employeeId === selectedEmployeeId),
    [rows, selectedEmployeeId],
  );

  function viewSelectedEmployee() {
    if (!selectedEmployeeId || !selectedExists) return;
    const searchParams = new URLSearchParams({ from: range.from, to: range.to });
    navigate(`/supervisor/team-attendance/${encodeURIComponent(selectedEmployeeId)}?${searchParams.toString()}`);
  }

  return (
    <AppShell>
      <ScreenHeader title="Employee Attendance" backTo="/supervisor/dashboard" />

      <div className="mt-4 rounded-card border border-light-grey bg-white p-3">
        <div className="flex items-center gap-2 text-xs font-semibold"><CalendarDays className="h-4 w-4" /> {formatAttendanceRange(range)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[10px] text-dark-grey">From<input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} className="mt-1 h-10 w-full rounded-card border border-light-grey px-2 text-xs text-black" /></label>
          <label className="text-[10px] text-dark-grey">To<input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} className="mt-1 h-10 w-full rounded-card border border-light-grey px-2 text-xs text-black" /></label>
        </div>
        <button type="button" onClick={() => void loadAttendance()} disabled={loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-card border border-light-grey px-3 text-xs font-semibold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {loadError ? <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">{loadError}</NoticeBanner> : null}

      <div className="mt-4 overflow-hidden rounded-card border border-light-grey bg-white shadow-sm">
        <table className="w-full table-fixed text-[10px]" data-row-count={rows.length}>
          <colgroup><col className="w-[38%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[14%]" /><col className="w-[16%]" /></colgroup>
          <thead className="bg-black text-white"><tr>{['Employee', 'Recorded', 'Completed', 'Open', 'Hours'].map((heading) => <th key={heading} scope="col" className="px-2 py-3 text-left font-semibold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-light-grey">
            {rows.length > 0 ? rows.map((row) => {
              const selected = selectedEmployeeId === row.employeeId;
              return (
                <tr key={row.employeeId} tabIndex={0} aria-selected={selected} data-employee-id={row.employeeId} onClick={() => setSelectedEmployeeId(row.employeeId)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedEmployeeId(row.employeeId); } }} className={`cursor-pointer transition-colors hover:bg-light-grey/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black ${selected ? 'bg-light-grey/70 outline outline-2 -outline-offset-2 outline-black' : ''}`}>
                  <th scope="row" className="truncate px-2 py-2.5 text-left font-semibold"><span className="block truncate">{row.employeeName}</span><span className="mt-1 block text-[9px] font-normal text-dark-grey">{row.employeeNumber}</span></th>
                  <td className="px-2 py-2.5">{row.recordedDays}</td>
                  <td className="px-2 py-2.5 font-medium text-status-green">{row.completedDays}</td>
                  <td className="px-2 py-2.5 font-medium text-status-red">{row.openDays + row.invalidDays}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">{row.totalHours}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-dark-grey">{loading ? 'Loading attendance…' : employees.length === 0 ? 'No active employees were returned by the database.' : 'No attendance records were found for this range.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pb-2 pt-4"><Button onClick={viewSelectedEmployee} disabled={!selectedExists} className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none">VIEW DETAILS</Button></div>
      <p className="pb-4 text-[10px] leading-4 text-dark-grey">The system shows only recorded attendance. It does not label employees absent without approved shift, leave, holiday, and work-schedule data.</p>
    </AppShell>
  );
}
