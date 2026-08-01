import { Calendar, Check, Clock3, Sparkles, Timer, User } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import { useSession } from '../context/SessionContext';
import { useLogout } from '../hooks/useLogout';
import {
  recordAttendanceClockIn,
  recordAttendanceClockOut,
} from '../services/attendanceApi';
import { formatElapsedDuration } from '../utils/attendanceDuration';

type ConfirmationVariant = 'clockIn' | 'clockOut';

type ConfirmationScreenProps = {
  variant: ConfirmationVariant;
};

type DetailRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  showDivider?: boolean;
};

const variantContent = {
  clockIn: {
    heading: 'Clocked In Successfully!',
    subtext: 'You have successfully clocked in.',
    buttonLabel: 'BACK TO CLOCK IN / OUT',
    circleClassName: 'bg-[#DCFCE7]',
    accentClassName: 'text-[#16A34A]',
  },
  clockOut: {
    heading: 'Clocked Out Successfully!',
    subtext: 'You have successfully clocked out.',
    buttonLabel: 'LOGOUT',
    circleClassName: 'bg-[#FCE7F3]',
    accentClassName: 'text-[#E11D48]',
  },
} as const;

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function DetailRow({ icon, label, value, showDivider = true }: DetailRowProps) {
  return (
    <div className={`flex items-center gap-3 py-3 ${showDivider ? 'border-b border-light-grey' : ''}`}>
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-cream-white text-black"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-dark-grey">{label}</span>
        <span className="mt-1 block text-sm font-bold text-black">{value}</span>
      </span>
    </div>
  );
}

export default function ConfirmationScreen({ variant }: ConfirmationScreenProps) {
  const navigate = useNavigate();
  const {
    staffNumber,
    clockInTime,
    recordClockIn,
    recordClockOut,
    showClockOutGuardMessage,
  } = useSession();
  const logout = useLogout();
  const [occurredAt] = useState(() => new Date());
  const [hoursWorked, setHoursWorked] = useState<string | null>(null);
  const clockInTimeOnEntry = useRef(clockInTime).current;
  const canClockOutOnEntry = variant !== 'clockOut' || clockInTimeOnEntry !== null;
  const content = variantContent[variant];

  useEffect(() => {
    if (variant === 'clockIn') {
      const recordedClockInTime = recordAttendanceClockIn(staffNumber!, occurredAt);
      recordClockIn(recordedClockInTime);
      return;
    }

    if (!canClockOutOnEntry) {
      showClockOutGuardMessage();
      navigate('/clock', { replace: true });
      return;
    }

    const completedEvent = recordAttendanceClockOut(staffNumber!, clockInTimeOnEntry!, occurredAt);
    if (completedEvent?.timeIn && completedEvent.timeOut) {
      setHoursWorked(formatElapsedDuration(completedEvent.timeIn, completedEvent.timeOut));
    }
    // Clear only the active shift; the completed attendance event remains persisted independently of logout.
    recordClockOut();
  }, [canClockOutOnEntry, clockInTimeOnEntry, navigate, occurredAt, recordClockIn, recordClockOut, showClockOutGuardMessage, staffNumber, variant]);

  if (variant === 'clockOut' && !canClockOutOnEntry) return null;

  const handlePrimaryAction = () => {
    if (variant === 'clockIn') {
      navigate('/clock');
      return;
    }

    logout();
  };

  return (
    <AppShell className="justify-center py-6">
      <div className="flex w-full flex-col items-center text-center">
        <div className={`relative flex h-28 w-28 items-center justify-center ${content.accentClassName}`} aria-hidden="true">
          <Sparkles className="absolute left-0 top-2 h-5 w-5 opacity-50" strokeWidth={1.5} />
          <Sparkles className="absolute bottom-1 right-0 h-4 w-4 opacity-50" strokeWidth={1.5} />
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${content.circleClassName}`}>
            <Check className="h-11 w-11" strokeWidth={3} />
          </div>
        </div>

        <h1 className="mt-5 max-w-[330px] text-2xl font-bold leading-tight">{content.heading}</h1>
        <p className="mt-2 text-sm text-dark-grey">{content.subtext}</p>

        <Card className="mt-7 w-full px-5 py-2 text-left">
          <DetailRow
            icon={<User className="h-6 w-6" strokeWidth={1.5} />}
            label="Employee Number"
            value={staffNumber!}
          />
          <DetailRow
            icon={<Calendar className="h-6 w-6" strokeWidth={1.5} />}
            label="Date"
            value={formatDate(occurredAt)}
          />
          <DetailRow
            icon={<Clock3 className="h-6 w-6" strokeWidth={1.5} />}
            label="Time"
            value={formatTime(occurredAt)}
            showDivider={variant === 'clockOut'}
          />
          {variant === 'clockOut' ? (
            <DetailRow
              icon={<Timer className="h-6 w-6" strokeWidth={1.5} />}
              label="Hours Worked"
              value={hoursWorked ?? '—'}
              showDivider={false}
            />
          ) : null}
        </Card>

        <Button onClick={handlePrimaryAction} className="mt-6">
          {content.buttonLabel}
        </Button>
      </div>
    </AppShell>
  );
}
