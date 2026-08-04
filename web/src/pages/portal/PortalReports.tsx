import { Download, FileBarChart, RefreshCw, UserCheck, UsersRound } from 'lucide-react';
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
import type { PortalRole } from '../../navigation/portalNavigation';
import { getAdminEmployees, type AdminEmployeeResponse } from '../../services/adminEmployeesApi';
import { ApiError } from '../../services/httpClient';
import {
  aggregateAttendanceByEmployee,
  buildAttendanceDayRows,
  getOrganisationAttendanceEvents,
  type EmployeeAttendanceAggregate,
} from '../../services/organisationAttendanceApi';
import { getWorkLocations } from '../../services/workLocationsApi';
import { getAttendanceRangeOptions } from '../../utils/attendanceRanges';
import { downloadCsv } from '../../utils/portalFormatters';

const STANDARD_HOURS_PER_DAY = 8;
const STANDARD_MINUTES_PER_DAY = STANDARD_HOURS_PER_DAY * 60;
const GOOD_MINIMUM_RATIO = 0.9;
const ABOVE_TARGET_RATIO = 1.1;

type AttendanceReportStatus =
  | 'Good'
  | 'Needs Review'
  | 'Above Target'
  | 'No Records'
  | 'In Progress';

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function countCompletedWeekdays(from: string, to: string, now = new Date()): number {
  const rangeStart = parseIsoDate(from);
  const selectedEnd = parseIsoDate(to);
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const comparisonEnd = selectedEnd.getTime() < today.getTime()
    ? selectedEnd
    : yesterday;

  if (rangeStart.getTime() > comparisonEnd.getTime()) return 0;

  let workingDays = 0;
  const currentDate = new Date(rangeStart);

  while (currentDate.getTime() <= comparisonEnd.getTime()) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays += 1;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

function formatDurationMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function determineReportStatus(
  row: EmployeeAttendanceAggregate,
  expectedMinutes: number,
): AttendanceReportStatus {
  if (row.openDays > 0 || row.invalidDays > 0) return 'Needs Review';
  if (expectedMinutes === 0) return row.recordedDays > 0 ? 'In Progress' : 'No Records';
  if (row.recordedDays === 0) return 'No Records';

  const completionRatio = row.workedDurationMinutes / expectedMinutes;
  if (completionRatio < GOOD_MINIMUM_RATIO) return 'Needs Review';
  if (completionRatio > ABOVE_TARGET_RATIO) return 'Above Target';
  return 'Good';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Report data could not be loaded.';
}

export default function PortalReports({ role }: { role: PortalRole }) {
  const { accessToken } = useSession();
  const initialRange = getAttendanceRangeOptions()[0];
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [employeeId, setEmployeeId] = useState('all');
  const [employees, setEmployees] = useState<AdminEmployeeResponse[]>([]);
  const [rows, setRows] = useState<EmployeeAttendanceAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!accessToken || !from || !to || from > to) return;
    setLoading(true);
    setError(null);
    try {
      const [employeeData, locationData, events] = await Promise.all([
        getAdminEmployees(accessToken),
        getWorkLocations(accessToken),
        getOrganisationAttendanceEvents(accessToken, { from, to }),
      ]);
      const dayRows = buildAttendanceDayRows(events, employeeData, locationData, { from, to });
      setEmployees(employeeData);
      setRows(aggregateAttendanceByEmployee(employeeData, dayRows));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, from, to]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const visibleRows = useMemo(
    () => employeeId === 'all' ? rows : rows.filter((row) => row.employeeId === employeeId),
    [employeeId, rows],
  );
  const completedWorkdays = useMemo(() => countCompletedWeekdays(from, to), [from, to]);
  const expectedMinutes = completedWorkdays * STANDARD_MINUTES_PER_DAY;
  const expectedHours = formatDurationMinutes(expectedMinutes);
  const recordedDays = visibleRows.reduce((total, row) => total + row.recordedDays, 0);
  const completedDays = visibleRows.reduce((total, row) => total + row.completedDays, 0);
  const exceptionDays = visibleRows.reduce((total, row) => total + row.openDays + row.invalidDays, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Reports"
        description={`${role === 'admin' ? 'Administrative' : 'HR'} attendance reporting calculated from database attendance events.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <PortalActionButton tone="secondary" disabled={visibleRows.length === 0} onClick={() => downloadCsv(
              `${role}-attendance-report-${from}-to-${to}.csv`,
              ['Employee', 'Employee No.', 'Department', 'Recorded Days', 'Completed Days', 'Open Days', 'Invalid Days', 'Worked Minutes', 'Total Hours', 'Expected Hours', 'Status'],
              visibleRows.map((row) => [
                row.employeeName,
                row.employeeNumber,
                row.departmentName,
                row.recordedDays,
                row.completedDays,
                row.openDays,
                row.invalidDays,
                row.workedDurationMinutes,
                row.totalHours,
                expectedHours,
                determineReportStatus(row, expectedMinutes),
              ]),
            )}><Download className="h-4 w-4" /> Export CSV</PortalActionButton>
            <PortalActionButton tone="secondary" onClick={() => void loadReport()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</PortalActionButton>
          </div>
        }
      />
      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      <MetricGrid>
        <MetricCard label="Employees" value={loading ? '—' : visibleRows.length} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard label="Recorded days" value={loading ? '—' : recordedDays} icon={<FileBarChart className="h-5 w-5" />} />
        <MetricCard label="Completed days" value={loading ? '—' : completedDays} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Open or invalid" value={loading ? '—' : exceptionDays} icon={<FileBarChart className="h-5 w-5" />} tone="amber" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 sm:grid-cols-3">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={portalInputClass} aria-label="Report start date" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={portalInputClass} aria-label="Report end date" />
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={portalInputClass} aria-label="Filter report by employee">
            <option value="all">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </div>
        {visibleRows.length === 0 ? (
          <PortalEmptyState>{loading ? 'Loading report…' : 'No employee attendance records were found for this range.'}</PortalEmptyState>
        ) : (
          <PortalTable>
            <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Department</th><th className={portalThClass}>Recorded</th><th className={portalThClass}>Completed</th><th className={portalThClass}>Open</th><th className={portalThClass}>Invalid</th><th className={portalThClass}>Total hours</th><th className={portalThClass}>Expected</th><th className={portalThClass}>Status</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.employeeId}>
                  <td className={portalTdClass}><p className="font-semibold">{row.employeeName}</p><p className="mt-1 text-xs text-dark-grey">{row.employeeNumber}</p></td>
                  <td className={portalTdClass}>{row.departmentName}</td>
                  <td className={portalTdClass}>{row.recordedDays}</td>
                  <td className={portalTdClass}>{row.completedDays}</td>
                  <td className={portalTdClass}>{row.openDays}</td>
                  <td className={portalTdClass}>{row.invalidDays}</td>
                  <td className={portalTdClass}>{row.totalHours}</td>
                  <td className={portalTdClass}>{expectedHours}</td>
                  <td className={portalTdClass}><PortalStatus value={determineReportStatus(row, expectedMinutes)} /></td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
      <p className="mt-4 text-xs leading-5 text-dark-grey">Status compares recorded time with {STANDARD_HOURS_PER_DAY} expected hours per completed weekday. Today, weekends, public holidays, approved leave, employee start dates and custom shift schedules are not yet fully accounted for.</p>
    </div>
  );
}
