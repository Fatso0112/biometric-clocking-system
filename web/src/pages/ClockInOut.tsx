import { AlertCircle, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import { useSession } from '../context/SessionContext';

export default function ClockInOut() {
  const navigate = useNavigate();
  const {
    staffNumber,
    clockOutGuardMessage,
    clearClockOutGuardMessage,
  } = useSession();

  const handleClockIn = () => {
    clearClockOutGuardMessage();
    navigate('/location-check', { state: { intendedAction: 'clockIn' } });
  };

  const handleClockOut = () => {
    clearClockOutGuardMessage();
    navigate('/location-check', { state: { intendedAction: 'clockOut' } });
  };

  return (
    <AppShell>
      <EmployeeHeader staffNumber={staffNumber!} profileFrom="/clock" />

      <Card className="mt-3 p-5">
        <h2 className="text-lg font-semibold">What would you like to do?</h2>
        <p className="mt-1 text-sm text-dark-grey">Choose an option to get started</p>
        <div className="mt-6 space-y-4">
          <ListItem
            icon={<LogIn className="h-8 w-8" strokeWidth={1.5} />}
            title="CLOCK IN"
            subtitle="Start your work day"
            onClick={handleClockIn}
          />
          <ListItem
            icon={<LogOut className="h-8 w-8" strokeWidth={1.5} />}
            title="CLOCK OUT"
            subtitle="End your work day"
            onClick={handleClockOut}
          />
        </div>
      </Card>

      {clockOutGuardMessage ? (
        <NoticeBanner
          className="mt-4"
          role="alert"
          icon={<AlertCircle className="h-5 w-5" strokeWidth={1.5} />}
        >
          {clockOutGuardMessage}
        </NoticeBanner>
      ) : null}
    </AppShell>
  );
}
