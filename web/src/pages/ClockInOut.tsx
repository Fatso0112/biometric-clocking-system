import { AlertCircle, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import { useSession } from '../context/SessionContext';

export default function ClockInOut() {
  const navigate = useNavigate();
  const {
    staffNumber,
    clockInTime,
    clockOutGuardMessage,
    showClockOutGuardMessage,
    clearClockOutGuardMessage,
    clearSession,
  } = useSession();
  const hasClockedIn = clockInTime !== null;

  const handleClockIn = () => {
    clearClockOutGuardMessage();
    navigate('/dashboard');
  };

  const handleClockOut = () => {
    if (!hasClockedIn) {
      showClockOutGuardMessage();
      return;
    }

    clearClockOutGuardMessage();
    navigate('/clock-out-confirmation');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <AppShell>
      <EmployeeHeader staffNumber={staffNumber ?? '10001'} onLogout={handleLogout} />

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
        <div
          className="mt-4 flex items-center gap-3 rounded-card bg-light-grey/70 px-4 py-3 text-xs leading-[1.5] text-dark-grey"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-black" strokeWidth={1.5} aria-hidden="true" />
          <span>{clockOutGuardMessage}</span>
        </div>
      ) : null}
    </AppShell>
  );
}
