import { CalendarDays, ChevronDown, CircleAlert, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import {
  getMostRecentWorkingDayOnOrBefore,
  getTeamAttendanceSnapshot,
} from '../services/absenceApi';
import { getSupervisorTeam } from '../services/teamApi';
import {
  getTeamAttendance,
  type TeamAttendanceRow,
} from '../services/teamAttendanceApi';
import {
  formatAttendanceRange,
  type AttendanceRange,
} from '../utils/attendanceRanges';
import {
  exportTeamAttendanceReportPdf,
  type TeamAttendanceReportSummary,
} from '../utils/pdfExports';

const TEAM_REPORT_RANGE: AttendanceRange = {
  from: '2024-05-01',
  to: '2024-05-31',
};

type ReportData = {
  summary: TeamAttendanceReportSummary;
  rows: TeamAttendanceRow[];
};

type SummaryCardProps = {
  label: string;
  value: number | null;
  tone?: 'plain' | 'present' | 'absent';
  testId: string;
};

function SummaryCard({ label, value, tone = 'plain', testId }: SummaryCardProps) {
  const toneClasses = {
    plain: '',
    present: 'bg-status-green-soft text-status-green',
    absent: 'bg-status-red-soft text-status-red',
  }[tone];

  return (
    <div
      className={`flex min-h-[84px] flex-col items-center justify-center rounded-card px-2 py-3 ${toneClasses}`}
    >
      <span className="text-[11px] text-dark-grey">{label}</span>
      <strong
        className={`mt-2 text-xl font-semibold ${tone === 'plain' ? 'text-black' : ''}`}
        data-testid={testId}
      >
        {value ?? '—'}
      </strong>
    </div>
  );
}

export default function SupervisorReports() {
  const { staffNumber } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!staffNumber) return;

    let active = true;
    const supervisorStaffNumber = staffNumber;
    const mostRecentWorkingDay = getMostRecentWorkingDayOnOrBefore(new Date());

    async function loadReportData() {
      setLoadError(null);

      try {
        const team = await getSupervisorTeam({ supervisorStaffNumber });
        const [snapshot, attendance] = await Promise.all([
          getTeamAttendanceSnapshot({
            members: team.members,
            referenceDate: mostRecentWorkingDay,
          }),
          getTeamAttendance({
            members: team.members,
            range: TEAM_REPORT_RANGE,
          }),
        ]);

        if (!active) return;
        setReportData({
          summary: {
            referenceDate: snapshot.referenceDate,
            totalMembers: team.members.length,
            presentMembers: snapshot.presentStaffNumbers.length,
            absentMembers: snapshot.absentStaffNumbers.length,
          },
          rows: attendance.rows,
        });
      } catch {
        if (!active) return;
        setLoadError('Attendance report data is temporarily unavailable. Please try again.');
      }
    }

    void loadReportData();
    return () => {
      active = false;
    };
  }, [staffNumber]);

  const handleDownload = async () => {
    if (!reportData || exporting) return;
    setExporting(true);
    setExportError(null);

    try {
      await exportTeamAttendanceReportPdf({
        range: TEAM_REPORT_RANGE,
        rangeLabel: formatAttendanceRange(TEAM_REPORT_RANGE),
        summary: reportData.summary,
        rows: reportData.rows,
      });
    } catch {
      setExportError('The team attendance report could not be downloaded. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <ScreenHeader title="Attendance Report" backTo="/supervisor/dashboard" />

      <section className="mt-4" aria-labelledby="report-type-label">
        <h2 id="report-type-label" className="text-xs font-semibold">
          Report Type
        </h2>
        <div
          className="relative mt-2 flex h-[52px] items-center rounded-card border border-light-grey bg-white pl-12 pr-4 text-xs"
          aria-label="Report Type: Team Attendance Report"
          data-testid="report-type"
        >
          <FileText
            className="pointer-events-none absolute left-4 h-5 w-5 text-black"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Team Attendance Report
        </div>
      </section>

      <section className="mt-4" aria-labelledby="report-date-range-label">
        <h2 id="report-date-range-label" className="text-xs font-semibold">
          Date Range
        </h2>
        <div
          className="relative mt-2 h-[52px] rounded-card border border-light-grey bg-white"
          aria-label={`Selected date range: ${formatAttendanceRange(TEAM_REPORT_RANGE)}`}
          data-testid="report-date-range"
        >
          <CalendarDays
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="flex h-full items-center pl-12 pr-11 text-xs text-black">
            {formatAttendanceRange(TEAM_REPORT_RANGE)}
          </span>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-grey"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      </section>

      <section
        className="mt-5"
        aria-labelledby="team-summary-title"
        data-reference-date={reportData?.summary.referenceDate}
      >
        <h2 id="team-summary-title" className="text-sm font-semibold">
          Team Summary
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <SummaryCard
            label="Total Members"
            value={reportData?.summary.totalMembers ?? null}
            testId="report-total-members"
          />
          <SummaryCard
            label="Present"
            value={reportData?.summary.presentMembers ?? null}
            tone="present"
            testId="report-present-members"
          />
          <SummaryCard
            label="Absent"
            value={reportData?.summary.absentMembers ?? null}
            tone="absent"
            testId="report-absent-members"
          />
        </div>
      </section>

      {loadError ? (
        <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">
          {loadError}
        </NoticeBanner>
      ) : null}

      {exportError ? (
        <NoticeBanner icon={<CircleAlert className="h-5 w-5" />} className="mt-4" role="alert">
          {exportError}
        </NoticeBanner>
      ) : null}

      <div className="pt-8">
        <Button
          onClick={handleDownload}
          disabled={!reportData || exporting}
          className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
        >
          {exporting ? 'DOWNLOADING…' : 'DOWNLOAD REPORT'}
        </Button>
      </div>
    </AppShell>
  );
}
