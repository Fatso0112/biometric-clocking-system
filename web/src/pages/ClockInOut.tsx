import {
  AlertCircle,
  Clock3,
  Coffee,
  LogIn,
  LogOut,
  RefreshCw,
  Timer,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import { useSession } from '../context/SessionContext';
import {
  getTodayAttendance,
  type LiveAttendanceAction,
  type TodayAttendanceResponse,
} from '../services/attendanceApi';
import { ApiError } from '../services/httpClient';
import { formatLunchCountdown } from '../utils/lunchBreakPolicy';

function formatTime(
  value: string | null,
  timeZoneId?: string,
): string {
  if (!value) return '—';

  return new Date(value).toLocaleTimeString('en-ZA', {
    timeZone: timeZoneId,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  return `${hours}h ${remainingMinutes}m`;
}

function getLoadError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;
  return 'Today’s attendance could not be loaded.';
}

export default function ClockInOut() {
  const navigate = useNavigate();
  const {
    staffNumber,
    employeeId,
    accessToken,
  } = useSession();

  const [summary, setSummary] =
    useState<TodayAttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasRequestedLunchEndRefresh = useRef(false);

  const loadToday = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setSummary(null);
      setErrorMessage(
        'This login account is not linked to an employee attendance record.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setSummary(
        await getTodayAttendance(employeeId, accessToken),
      );
    } catch (error) {
      setErrorMessage(getLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, employeeId]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const lunchEndMs =
    summary?.lunchBreakEndsAtUtc
      ? new Date(
          summary.lunchBreakEndsAtUtc,
        ).getTime()
      : Number.NaN;

  const lunchRemainingSeconds =
    Number.isFinite(lunchEndMs)
      ? Math.max(
          0,
          Math.ceil(
            (lunchEndMs - nowMs) /
              1000,
          ),
        )
      : 0;

  useEffect(() => {
    if (summary?.status !== 'OnBreak') {
      hasRequestedLunchEndRefresh.current = false;
      return;
    }

    if (
      lunchRemainingSeconds > 0 ||
      hasRequestedLunchEndRefresh.current
    ) {
      return;
    }

    hasRequestedLunchEndRefresh.current = true;
    void loadToday();
  }, [loadToday, lunchRemainingSeconds, summary?.status]);

  function startAction(action: LiveAttendanceAction) {
    navigate('/location-check', {
      state: { intendedAction: action },
    });
  }

  const status = summary?.status;
  const canStartLunch = Boolean(
    summary &&
      summary.status === 'Working' &&
      !summary.hasTakenLunchBreak,
  );

  return (
    <AppShell>
      <EmployeeHeader
        staffNumber={
          summary?.employeeNumber ??
          staffNumber ??
          '—'
        }
        profileFrom="/clock"
      />

      <Card className="mt-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-dark-grey">
              Today’s status
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {isLoading
                ? 'Loading…'
                : status ?? 'Unavailable'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void loadToday()}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-white disabled:opacity-50"
            aria-label="Refresh today’s attendance"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                isLoading ? 'animate-spin' : ''
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {summary ? (
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-card bg-cream-white p-3">
              <Clock3 className="h-5 w-5" strokeWidth={1.5} />
              <p className="mt-2 text-dark-grey">Clock in</p>
              <p className="mt-1 font-semibold">
                {formatTime(
                  summary.clockInAtUtc,
                  summary.timeZoneId,
                )}
              </p>
            </div>

            <div className="rounded-card bg-cream-white p-3">
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              <p className="mt-2 text-dark-grey">Clock out</p>
              <p className="mt-1 font-semibold">
                {formatTime(
                  summary.clockOutAtUtc,
                  summary.timeZoneId,
                )}
              </p>
            </div>

            <div className="rounded-card bg-cream-white p-3">
              <Timer className="h-5 w-5" strokeWidth={1.5} />
              <p className="mt-2 text-dark-grey">Worked</p>
              <p className="mt-1 font-semibold">
                {formatDuration(summary.workedDurationMinutes)}
              </p>
            </div>

            <div className="rounded-card bg-cream-white p-3">
              <Coffee className="h-5 w-5" strokeWidth={1.5} />
              <p className="mt-2 text-dark-grey">Break</p>
              <p className="mt-1 font-semibold">
                {formatDuration(summary.lunchDurationMinutes)}
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      {summary?.status === 'OnBreak' ? (
        <Card className="mt-4 p-5 text-center">
          <Coffee
            className="mx-auto h-7 w-7"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-dark-grey">
            Lunch break time remaining
          </p>
          <p
            className="mt-2 text-4xl font-bold tabular-nums"
            aria-live="polite"
          >
            {formatLunchCountdown(lunchRemainingSeconds)}
          </p>
          <p className="mt-2 text-sm text-dark-grey">
            Break ends automatically after{' '}
            {summary.lunchBreakMaximumMinutes} minutes
            at{' '}
            {formatTime(
              summary.lunchBreakEndsAtUtc,
              summary.timeZoneId,
            )}.
          </p>
        </Card>
      ) : null}

      {errorMessage ? (
        <NoticeBanner
          className="mt-4"
          role="alert"
          icon={
            <AlertCircle
              className="h-5 w-5"
              strokeWidth={1.5}
            />
          }
        >
          {errorMessage}
        </NoticeBanner>
      ) : null}

      {!isLoading && summary ? (
        <Card className="mt-4 p-5">
          <h2 className="text-lg font-semibold">
            What would you like to do?
          </h2>

          <p className="mt-1 text-sm text-dark-grey">
            Only valid next actions are shown.
          </p>

          <div className="mt-6 space-y-4">
            {summary.status === 'NotPresent' ? (
              <ListItem
                icon={<LogIn className="h-8 w-8" strokeWidth={1.5} />}
                title="CLOCK IN"
                subtitle="Start your work day"
                onClick={() => startAction('clockIn')}
              />
            ) : null}

            {summary.status === 'Working' ? (
              <>
                {canStartLunch ? (
                  <ListItem
                    icon={<Coffee className="h-8 w-8" strokeWidth={1.5} />}
                    title="START BREAK"
                    subtitle={`Up to ${summary.lunchBreakMaximumMinutes} minutes`}
                    onClick={() => startAction('breakStart')}
                  />
                ) : null}

                {summary.hasTakenLunchBreak ? (
                  <NoticeBanner
                    icon={<Coffee className="h-5 w-5" strokeWidth={1.5} />}
                  >
                    Today’s lunch break has already been used. Each workday allows one lunch break of up to {summary.lunchBreakMaximumMinutes} minutes.
                  </NoticeBanner>
                ) : null}

                <ListItem
                  icon={<LogOut className="h-8 w-8" strokeWidth={1.5} />}
                  title="CLOCK OUT"
                  subtitle="End your work day"
                  onClick={() => startAction('clockOut')}
                />
              </>
            ) : null}

            {summary.status === 'OnBreak' &&
            lunchRemainingSeconds > 0 ? (
              <ListItem
                icon={<Coffee className="h-8 w-8" strokeWidth={1.5} />}
                title="END BREAK"
                subtitle="Return to work early"
                onClick={() => startAction('breakEnd')}
              />
            ) : null}

            {summary.status === 'Completed' ? (
              <NoticeBanner
                icon={<Clock3 className="h-5 w-5" strokeWidth={1.5} />}
              >
                Your work day is complete. No further attendance action is available today.
              </NoticeBanner>
            ) : null}

            {summary.status === 'MissingClockOut' ||
            summary.status === 'InvalidSequence' ? (
              <NoticeBanner
                role="alert"
                icon={<AlertCircle className="h-5 w-5" strokeWidth={1.5} />}
              >
                Your attendance record requires supervisor or HR review before another event can be recorded.
              </NoticeBanner>
            ) : null}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
