import { CalendarDays, ChevronDown, CircleAlert, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import {
  getSupervisorTeamMember,
  type TeamMemberRecord,
} from '../services/teamApi';
import {
  getEmployeeAttendanceDetail,
  type GetEmployeeAttendanceDetailResponse,
} from '../services/teamAttendanceApi';
import {
  formatAttendanceRange,
  type AttendanceRange,
} from '../utils/attendanceRanges';
import { exportAttendanceHistoryPdf } from '../utils/pdfExports';

type DetailState =
  | { status: 'loading' }
  | {
      status: 'ready';
      member: TeamMemberRecord;
      detail: GetEmployeeAttendanceDetailResponse;
    }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function getRouteRange(from: string | null, to: string | null): AttendanceRange | null {
  if (!from || !to || !isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
    return null;
  }
  return { from, to };
}

export default function SupervisorEmployeeDetails() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const { staffNumber } = useSession();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const range = useMemo(() => getRouteRange(from, to), [from, to]);
  const [detailState, setDetailState] = useState<DetailState>({ status: 'loading' });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const preservedSearchParams = new URLSearchParams();

  if (from) preservedSearchParams.set('from', from);
  if (to) preservedSearchParams.set('to', to);

  const backTo = `/supervisor/team-attendance${
    preservedSearchParams.size > 0 ? `?${preservedSearchParams.toString()}` : ''
  }`;

  useEffect(() => {
    if (!staffNumber || !employeeId) {
      setDetailState({ status: 'not-found' });
      return;
    }

    if (!range) {
      setDetailState({
        status: 'error',
        message: 'A valid date range is required to view employee attendance.',
      });
      return;
    }

    let active = true;
    const supervisorStaffNumber = staffNumber;
    const requestedEmployeeId = employeeId;
    const requestedRange = range;

    async function loadEmployeeDetails() {
      setDetailState({ status: 'loading' });

      try {
        const teamMemberResponse = await getSupervisorTeamMember({
          supervisorStaffNumber,
          employeeId: requestedEmployeeId,
        });

        if (!active) return;
        if (!teamMemberResponse.member) {
          setDetailState({ status: 'not-found' });
          return;
        }

        const detail = await getEmployeeAttendanceDetail({
          member: teamMemberResponse.member,
          range: requestedRange,
        });

        if (active) {
          setDetailState({
            status: 'ready',
            member: teamMemberResponse.member,
            detail,
          });
        }
      } catch {
        if (!active) return;
        setDetailState({
          status: 'error',
          message: 'Employee attendance is temporarily unavailable. Please try again.',
        });
      }
    }

    void loadEmployeeDetails();
    return () => {
      active = false;
    };
  }, [employeeId, range, staffNumber]);

  const handleExport = async () => {
    if (detailState.status !== 'ready' || exporting) return;
    setExporting(true);
    setExportError(null);

    try {
      await exportAttendanceHistoryPdf({
        staffNumber: detailState.member.staffNumber,
        range: detailState.detail.range,
        rangeLabel: formatAttendanceRange(detailState.detail.range),
        summary: {
          daysPresent: detailState.detail.summary.presentDays,
          daysAbsent: detailState.detail.summary.absentDays,
          totalHours: detailState.detail.summary.totalHours,
        },
        records: detailState.detail.records,
      });
    } catch {
      setExportError('The attendance PDF could not be exported. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <ScreenHeader title="Employee Details" backTo={backTo} />

      {detailState.status === 'ready' ? (
        <>
          <div className="mt-4">
            <p className="text-[10px] text-dark-grey">Employee</p>
            <h2 className="mt-1 text-base font-semibold" data-testid="employee-identity">
              {detailState.member.name} ({detailState.member.staffNumber})
            </h2>
          </div>

          <div
            className="relative mt-4 h-[52px] rounded-card border border-light-grey bg-white"
            aria-label={`Selected date range: ${formatAttendanceRange(detailState.detail.range)}`}
            data-testid="employee-date-range"
          >
            <CalendarDays
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="flex h-full items-center pl-12 pr-11 text-xs text-black">
              {formatAttendanceRange(detailState.detail.range)}
            </span>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-grey"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Employee attendance summary">
            <div className="rounded-card bg-status-green-soft px-2 py-4 text-center">
              <p className="text-[9px] text-dark-grey">Days Present</p>
              <p className="mt-2 text-xl font-semibold text-status-green" data-testid="days-present">
                {detailState.detail.summary.presentDays}
              </p>
            </div>
            <div className="rounded-card bg-status-red-soft px-2 py-4 text-center">
              <p className="text-[9px] text-dark-grey">Days Absent</p>
              <p className="mt-2 text-xl font-semibold text-status-red" data-testid="days-absent">
                {detailState.detail.summary.absentDays}
              </p>
            </div>
            <div className="rounded-card bg-white px-2 py-4 text-center shadow-sm">
              <p className="text-[9px] text-dark-grey">Working Hours</p>
              <p className="mt-2 whitespace-nowrap text-xl font-semibold" data-testid="working-hours">
                {detailState.detail.summary.totalHours}
              </p>
            </div>
          </div>

          {exportError ? (
            <NoticeBanner
              icon={<CircleAlert className="h-5 w-5" />}
              className="mt-4"
              role="alert"
            >
              {exportError}
            </NoticeBanner>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-card border border-light-grey bg-white shadow-sm">
            <table
              className="w-full table-fixed text-[10px]"
              data-row-count={detailState.detail.records.length}
            >
              <colgroup>
                <col className="w-[29%]" />
                <col className="w-[24%]" />
                <col className="w-[24%]" />
                <col className="w-[23%]" />
              </colgroup>
              <thead className="bg-black text-white">
                <tr>
                  {['Date', 'Clock In', 'Clock Out', 'Hours'].map((heading) => (
                    <th key={heading} scope="col" className="px-2 py-3 text-left font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-light-grey">
                {detailState.detail.records.map((record) => (
                  <tr key={record.date} data-attendance-status={record.status}>
                    <th scope="row" className="whitespace-nowrap px-2 py-2.5 text-left font-semibold">
                      {record.date}
                    </th>
                    <td className="whitespace-nowrap px-2 py-2.5">{record.timeIn ?? '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{record.timeOut ?? '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{record.hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pb-2 pt-4">
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
            >
              <FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {exporting ? 'EXPORTING…' : 'EXPORT PDF'}
            </Button>
          </div>
        </>
      ) : detailState.status === 'loading' ? (
        <p className="mt-6 text-center text-xs text-dark-grey">Loading employee attendance…</p>
      ) : (
        <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">
          {detailState.status === 'not-found'
            ? 'This employee could not be found in your team.'
            : detailState.message}
        </NoticeBanner>
      )}
    </AppShell>
  );
}
