import {
  Calendar,
  Check,
  Clock3,
  Coffee,
  Sparkles,
  Timer,
  User,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import { useLogout } from '../hooks/useLogout';
import {
  getAttendanceConfirmationState,
  type IntendedClockAction,
} from '../types/navigation';

type ConfirmationVariant = IntendedClockAction;

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
    subtext: 'Your clock-in was recorded by the backend.',
    buttonLabel: 'BACK TO ATTENDANCE',
    circleClassName: 'bg-[#DCFCE7]',
    accentClassName: 'text-[#16A34A]',
  },
  breakStart: {
    heading: 'Break Started!',
    subtext: 'Your lunch break has started.',
    buttonLabel: 'BACK TO ATTENDANCE',
    circleClassName: 'bg-[#FEF3C7]',
    accentClassName: 'text-[#D97706]',
  },
  breakEnd: {
    heading: 'Break Ended!',
    subtext: 'You are now marked as working again.',
    buttonLabel: 'BACK TO ATTENDANCE',
    circleClassName: 'bg-[#DBEAFE]',
    accentClassName: 'text-[#2563EB]',
  },
  clockOut: {
    heading: 'Clocked Out Successfully!',
    subtext: 'Your work day has been completed.',
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
  return date.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining} min`;
}

function DetailRow({
  icon,
  label,
  value,
  showDivider = true,
}: DetailRowProps) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${
        showDivider ? 'border-b border-light-grey' : ''
      }`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-cream-white text-black"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-dark-grey">{label}</span>
        <span className="mt-1 block text-sm font-bold text-black">
          {value}
        </span>
      </span>
    </div>
  );
}

export default function ConfirmationScreen({
  variant,
}: ConfirmationScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const confirmation = getAttendanceConfirmationState(location.state);
  const content = variantContent[variant];

  useEffect(() => {
    if (!confirmation || confirmation.intendedAction !== variant) {
      navigate('/clock', { replace: true });
    }
  }, [confirmation, navigate, variant]);

  if (!confirmation || confirmation.intendedAction !== variant) {
    return null;
  }

  const occurredAt = new Date(confirmation.event.capturedAtUtc);
  const safeOccurredAt = Number.isNaN(occurredAt.getTime())
    ? new Date()
    : occurredAt;

  return (
    <AppShell className="justify-center py-6">
      <div className="flex w-full flex-col items-center text-center">
        <div
          className={`relative flex h-28 w-28 items-center justify-center ${content.accentClassName}`}
          aria-hidden="true"
        >
          <Sparkles className="absolute left-0 top-2 h-5 w-5 opacity-50" strokeWidth={1.5} />
          <Sparkles className="absolute bottom-1 right-0 h-4 w-4 opacity-50" strokeWidth={1.5} />
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${content.circleClassName}`}>
            <Check className="h-11 w-11" strokeWidth={3} />
          </div>
        </div>

        <h1 className="mt-5 max-w-[330px] text-2xl font-bold leading-tight">
          {content.heading}
        </h1>
        <p className="mt-2 text-sm text-dark-grey">
          {confirmation.event.message || content.subtext}
        </p>

        <Card className="mt-7 w-full px-5 py-2 text-left">
          <DetailRow
            icon={<User className="h-6 w-6" strokeWidth={1.5} />}
            label="Employee Number"
            value={confirmation.event.employeeNumber}
          />
          <DetailRow
            icon={<Calendar className="h-6 w-6" strokeWidth={1.5} />}
            label="Date"
            value={formatDate(safeOccurredAt)}
          />
          <DetailRow
            icon={<Clock3 className="h-6 w-6" strokeWidth={1.5} />}
            label="Time"
            value={formatTime(safeOccurredAt)}
          />
          <DetailRow
            icon={<Timer className="h-6 w-6" strokeWidth={1.5} />}
            label="Worked Time"
            value={formatMinutes(confirmation.summary.workedDurationMinutes)}
          />
          <DetailRow
            icon={<Coffee className="h-6 w-6" strokeWidth={1.5} />}
            label="Break Time"
            value={formatMinutes(confirmation.summary.lunchDurationMinutes)}
            showDivider={false}
          />
        </Card>

        <Button
          className="mt-7"
          onClick={() => {
            if (variant === 'clockOut') {
              logout();
            } else {
              navigate('/clock', { replace: true });
            }
          }}
        >
          {content.buttonLabel}
        </Button>
      </div>
    </AppShell>
  );
}
