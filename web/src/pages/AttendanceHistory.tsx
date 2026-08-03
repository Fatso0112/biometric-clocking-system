import { CalendarDays, ChevronDown, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import {
  getLiveAttendanceBundle,
  type AttendanceRecord,
  type AttendanceSummary as AttendanceSummaryData,
} from '../services/attendanceApi';
import { getProfileOrigin } from '../types/navigation';
import { getAttendanceRangeOptions } from '../utils/attendanceRanges';
import { exportAttendanceHistoryPdf } from '../utils/pdfExports';

const statusStyles: Record<AttendanceRecord['status'], string> = {
  present: 'bg-status-green-soft text-status-green',
  absent: 'bg-status-red-soft text-status-red',
  late: 'bg-status-amber-soft text-status-amber',
};

function formatStatus(status: AttendanceRecord['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AttendanceHistory() {
  const location = useLocation();
  const {
    staffNumber,
    employeeId,
    accessToken,
  } = useSession();
  const resolvedStaffNumber = staffNumber ?? '—';
  const profileFrom = getProfileOrigin(location.state);
  const rangeOptions = getAttendanceRangeOptions();
  const [selectedRangeId, setSelectedRangeId] = useState(rangeOptions[0].id);
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [summary, setSummary] = useState<AttendanceSummaryData | null>(null);
  const [exporting, setExporting] = useState(false);
  const selectedRange = rangeOptions.find((range) => range.id === selectedRangeId) ?? rangeOptions[0];

  useEffect(() => {
    let active = true;
    setRecords(null);
    setSummary(null);

    if (!employeeId || !accessToken) {
      setRecords([]);
      return () => {
        active = false;
      };
    }

    void getLiveAttendanceBundle(
      employeeId,
      accessToken,
      selectedRange,
    )
      .then((bundle) => {
        if (!active) return;
        setRecords(bundle.records);
        setSummary(bundle.summary);
      })
      .catch(() => {
        if (!active) return;
        setRecords([]);
        setSummary(null);
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    employeeId,
    selectedRange.from,
    selectedRange.to,
  ]);

  const handleExport = async () => {
    if (!records || !summary || exporting) return;
    setExporting(true);

    try {
      await exportAttendanceHistoryPdf({
        staffNumber: resolvedStaffNumber,
        range: selectedRange,
        rangeLabel: selectedRange.label,
        summary: {
          daysPresent: summary.daysPresent,
          daysAbsent: summary.daysAbsent,
          daysLate: summary.daysLate,
          totalHours: summary.totalHours,
          calculationNote: summary.calculationNote,
        },
        records,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <ScreenHeader
        title="Attendance History"
        backTo="/attendance-register"
        backState={{ from: profileFrom }}
      />

      <div className="mt-6 sm:mt-4">
        <label htmlFor="attendance-range" className="text-xs font-semibold text-black">
          Date Range
        </label>
        <div className="relative mt-2 sm:mt-1.5">
          <CalendarDays
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <select
            id="attendance-range"
            value={selectedRangeId}
            onChange={(event) => setSelectedRangeId(event.target.value as typeof selectedRangeId)}
            className="h-[52px] w-full appearance-none rounded-card border border-light-grey bg-white py-3 pl-12 pr-11 text-xs text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black sm:h-12"
          >
            {rangeOptions.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-light-grey bg-white shadow-sm sm:mt-3">
        <table className="w-full table-fixed text-[9px]">
          <colgroup>
            <col className="w-[23%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[19%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-black text-white">
            <tr>
              {['Date', 'Day', 'In', 'Out', 'Status', 'Hours'].map((heading) => (
                <th key={heading} scope="col" className="px-1 py-3 text-left font-semibold sm:py-2.5">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-light-grey">
            {records ? (
              records.map((record) => (
                <tr key={record.date}>
                  <td className="whitespace-nowrap px-1 py-2.5 sm:py-2">{record.date}</td>
                  <td className="whitespace-nowrap px-1 py-2.5 sm:py-2">{record.day}</td>
                  <td className="whitespace-nowrap px-1 py-2.5 sm:py-2">{record.timeIn ?? '—'}</td>
                  <td className="whitespace-nowrap px-1 py-2.5 sm:py-2">{record.timeOut ?? '—'}</td>
                  <td className="px-1 py-2.5 sm:py-2">
                    <span className={`inline-flex rounded-full px-1.5 py-1 font-semibold ${statusStyles[record.status]}`}>
                      {formatStatus(record.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-1 py-2.5 sm:py-2">{record.hours ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-dark-grey">
                  Loading attendance…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-6 sm:pt-4">
        <Button
          onClick={handleExport}
          disabled={!records || !summary || exporting}
          className="inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
        >
          <FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          {exporting ? 'EXPORTING…' : 'EXPORT PDF'}
        </Button>
      </div>
    </AppShell>
  );
}
