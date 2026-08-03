import { FileText } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AttendanceStatList from '../components/AttendanceStatList';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';
import { useSession } from '../context/SessionContext';
import { useAttendanceSummary } from '../hooks/useAttendanceSummary';
import { getProfileOrigin } from '../types/navigation';
import { getAttendanceRangeOptions } from '../utils/attendanceRanges';

export default function AttendanceRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    employeeId,
    accessToken,
  } = useSession();
  const profileFrom = getProfileOrigin(location.state);
  const currentRange = useMemo(() => getAttendanceRangeOptions()[0], []);
  const summary = useAttendanceSummary(
    employeeId,
    accessToken,
    currentRange,
  );

  return (
    <AppShell>
      <ScreenHeader title="Attendance Register" backTo="/profile" backState={{ from: profileFrom }} />

      <Card className="mt-6 p-5">
        <h2 className="text-lg font-semibold">Attendance Summary</h2>
        <p className="mt-1 text-sm text-dark-grey">{currentRange.label}</p>
        <div className="mt-4">
          <AttendanceStatList summary={summary} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/attendance-summary', { state: { from: profileFrom } })}
            className="text-xs font-semibold text-dark-grey underline underline-offset-4 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
          >
            Export Summary
          </button>
        </div>
      </Card>

      <div className="mt-auto pt-6">
        <Button
          onClick={() => navigate('/attendance-history', { state: { from: profileFrom } })}
          className="inline-flex items-center justify-center gap-2"
        >
          <FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          VIEW ATTENDANCE HISTORY
        </Button>
      </div>
    </AppShell>
  );
}
