import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AttendanceStatList from '../components/AttendanceStatList';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import { useAttendanceSummary } from '../hooks/useAttendanceSummary';
import { exportAttendanceSummaryPdf } from '../utils/pdfExports';
import { getProfileOrigin } from '../types/navigation';
import { getAttendanceRangeOptions } from '../utils/attendanceRanges';

export default function AttendanceSummary() {
  const location = useLocation();
  const { staffNumber } = useSession();
  const currentRange = useMemo(() => getAttendanceRangeOptions()[0], []);
  const resolvedStaffNumber = staffNumber!;
  const profileFrom = getProfileOrigin(location.state);
  const summary = useAttendanceSummary(resolvedStaffNumber, currentRange);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!summary || exporting) return;
    setExporting(true);

    try {
      await exportAttendanceSummaryPdf({
        staffNumber: resolvedStaffNumber,
        range: currentRange,
        rangeLabel: currentRange.label,
        summary,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <ScreenHeader
        title="Attendance Summary"
        backTo="/attendance-register"
        backState={{ from: profileFrom }}
      />

      <Card className="mt-6 p-5">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p className="mt-1 text-sm text-dark-grey">{currentRange.label}</p>
        <div className="mt-4">
          <AttendanceStatList summary={summary} />
        </div>
      </Card>

      <div className="mt-auto pt-6">
        <Button
          onClick={handleExport}
          disabled={!summary || exporting}
          className="inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
        >
          <FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          {exporting ? 'EXPORTING…' : 'EXPORT PDF'}
        </Button>
      </div>
    </AppShell>
  );
}
