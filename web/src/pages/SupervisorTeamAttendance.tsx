import { CalendarDays, ChevronDown, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import { getSupervisorTeam } from '../services/teamApi';
import {
  getTeamAttendance,
  type TeamAttendanceRow,
} from '../services/teamAttendanceApi';
import {
  formatAttendanceRange,
  type AttendanceRange,
} from '../utils/attendanceRanges';

const TEAM_ATTENDANCE_RANGE: AttendanceRange = {
  from: '2024-05-01',
  to: '2024-05-31',
};

export default function SupervisorTeamAttendance() {
  const navigate = useNavigate();
  const { staffNumber } = useSession();
  const [rows, setRows] = useState<TeamAttendanceRow[] | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffNumber) return;

    let active = true;
    const supervisorStaffNumber = staffNumber;

    async function loadTeamAttendance() {
      try {
        setLoadError(null);
        const team = await getSupervisorTeam({ supervisorStaffNumber });
        const attendance = await getTeamAttendance({
          members: team.members,
          range: TEAM_ATTENDANCE_RANGE,
        });

        if (active) setRows(attendance.rows);
      } catch {
        if (!active) return;
        setLoadError('Team attendance is temporarily unavailable. Please try again.');
      }
    }

    void loadTeamAttendance();
    return () => {
      active = false;
    };
  }, [staffNumber]);

  const selectEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
  };

  const viewSelectedEmployee = () => {
    if (!selectedEmployeeId) return;
    const searchParams = new URLSearchParams({
      from: TEAM_ATTENDANCE_RANGE.from,
      to: TEAM_ATTENDANCE_RANGE.to,
    });
    navigate(
      `/supervisor/team-attendance/${encodeURIComponent(selectedEmployeeId)}?${searchParams.toString()}`,
    );
  };

  return (
    <AppShell>
      <ScreenHeader title="Team Attendance" backTo="/supervisor/dashboard" />

      <div
        className="relative mt-4 h-[52px] rounded-card border border-light-grey bg-white"
        aria-label={`Selected date range: ${formatAttendanceRange(TEAM_ATTENDANCE_RANGE)}`}
      >
        <CalendarDays
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="flex h-full items-center pl-12 pr-11 text-xs text-black">
          {formatAttendanceRange(TEAM_ATTENDANCE_RANGE)}
        </span>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-grey"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      {loadError ? (
        <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">
          {loadError}
        </NoticeBanner>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-card border border-light-grey bg-white shadow-sm">
        <table className="w-full table-fixed text-[10px]" data-row-count={rows?.length}>
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-black text-white">
            <tr>
              {['Employee', 'Present', 'Absent', 'Hours'].map((heading) => (
                <th key={heading} scope="col" className="px-2 py-3 text-left font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-light-grey">
            {rows ? (
              rows.map((row) => {
                const selected = selectedEmployeeId === row.employeeId;
                return (
                  <tr
                    key={row.employeeId}
                    tabIndex={0}
                    aria-selected={selected}
                    data-employee-id={row.employeeId}
                    onClick={() => selectEmployee(row.employeeId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectEmployee(row.employeeId);
                      }
                    }}
                    className={`cursor-pointer transition-colors hover:bg-light-grey/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black ${
                      selected ? 'bg-light-grey/70 outline outline-2 -outline-offset-2 outline-black' : ''
                    }`}
                  >
                    <th scope="row" className="truncate px-2 py-2.5 text-left font-semibold">
                      {row.employeeName}
                    </th>
                    <td className="px-2 py-2.5 font-medium text-status-green">
                      {row.presentDays}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-status-red">
                      {row.absentDays}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">{row.totalHours}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs text-dark-grey">
                  Loading attendance…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pb-2 pt-4">
        <Button
          onClick={viewSelectedEmployee}
          disabled={!selectedEmployeeId}
          className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
        >
          VIEW DETAILS
        </Button>
      </div>
    </AppShell>
  );
}
