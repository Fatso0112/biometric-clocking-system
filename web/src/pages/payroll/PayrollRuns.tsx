import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Plus,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import type { PortalRole } from '../../navigation/portalNavigation';
import { ApiError } from '../../services/httpClient';
import {
  createPayrollRun,
  getPayrollRuns,
  type PayrollRunListItem,
  type PayrollRunStatus,
} from '../../services/payrollApi';
import {
  canManagePayroll,
  formatDateOnly,
  formatDateTime,
  formatPayrollHours,
  formatPayrollMoney,
  getPayrollRunPath,
} from './payrollPresentation';

const PAYROLL_STATUSES: readonly PayrollRunStatus[] = [
  'Draft',
  'PendingReview',
  'Approved',
  'Cancelled',
];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(): {
  from: string;
  to: string;
} {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toIsoDate(firstDay),
    to: toIsoDate(lastDay),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Payroll data could not be loaded.';
}

export default function PayrollRuns({ role }: { role: PortalRole }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken } = useSession();
  const defaultRange = useMemo(getCurrentMonthRange, []);
  const canManage = canManagePayroll(role);

  const [filterFrom, setFilterFrom] = useState(
    searchParams.get('from') ?? '',
  );
  const [filterTo, setFilterTo] = useState(
    searchParams.get('to') ?? '',
  );
  const [filterStatus, setFilterStatus] = useState<PayrollRunStatus | ''>('');
  const [periodStart, setPeriodStart] = useState(
    searchParams.get('from') ?? defaultRange.from,
  );
  const [periodEnd, setPeriodEnd] = useState(
    searchParams.get('to') ?? defaultRange.to,
  );
  const [notes, setNotes] = useState('');
  const [runs, setRuns] = useState<PayrollRunListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!accessToken) return;

    if (filterFrom && filterTo && filterFrom > filterTo) {
      setError('The filter start date must not be after the end date.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getPayrollRuns(accessToken, {
        from: filterFrom || undefined,
        to: filterTo || undefined,
        status: filterStatus,
        page: 1,
        pageSize: 100,
      });

      setRuns(result.items);
      setTotalCount(result.totalCount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterFrom, filterStatus, filterTo]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const exceptionCount = runs.reduce(
    (total, run) => total + run.exceptionCount,
    0,
  );
  const approvedCount = runs.filter(
    (run) => run.status === 'Approved',
  ).length;
  const pageGrossPay = runs.reduce(
    (total, run) => total + run.totalGrossPay,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PortalPageHeader
        title="Payroll"
        description={
          canManage
            ? 'Create payroll runs from completed attendance, review exceptions and approve calculated gross pay.'
            : 'Review payroll runs and employee gross-pay calculations. Payroll creation and approval are restricted.'
        }
        actions={(
          <PortalActionButton
            tone="secondary"
            disabled={loading}
            onClick={() => void loadRuns()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </PortalActionButton>
        )}
      />

      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      {success ? <PortalNotice>{success}</PortalNotice> : null}

      <MetricGrid>
        <MetricCard
          label="Payroll runs"
          value={loading ? '—' : totalCount}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricCard
          label="Approved"
          value={loading ? '—' : approvedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
        />
        <MetricCard
          label="Exceptions"
          value={loading ? '—' : exceptionCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={exceptionCount > 0 ? 'amber' : 'green'}
        />
        <MetricCard
          label="Gross pay shown"
          value={loading ? '—' : formatPayrollMoney(pageGrossPay)}
          icon={<Banknote className="h-5 w-5" />}
        />
      </MetricGrid>

      {canManage ? (
        <PortalPanel className="mt-6 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-white">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Run payroll</h2>
              <p className="mt-1 text-sm leading-6 text-dark-grey">
                Attendance is recalculated for every active employee in the selected period.
                A run with missing rates or attendance exceptions is saved as Pending Review.
              </p>
            </div>
          </div>

          <form
            className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end"
            onSubmit={async (event) => {
              event.preventDefault();

              if (!accessToken) return;
              if (!periodStart || !periodEnd) {
                setError('Choose both payroll period dates.');
                return;
              }
              if (periodStart > periodEnd) {
                setError('The payroll period start date must not be after the end date.');
                return;
              }

              setCreating(true);
              setError(null);
              setSuccess(null);

              try {
                const created = await createPayrollRun(accessToken, {
                  periodStart,
                  periodEnd,
                  notes,
                });

                setNotes('');
                setSuccess(
                  created.status === 'PendingReview'
                    ? 'Payroll run created with exceptions that require review.'
                    : 'Payroll run created successfully.',
                );
                navigate(getPayrollRunPath(role, created.id));
              } catch (createError) {
                setError(getErrorMessage(createError));
              } finally {
                setCreating(false);
              }
            }}
          >
            <PortalField label="Period start">
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className={portalInputClass}
                required
              />
            </PortalField>
            <PortalField label="Period end">
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className={portalInputClass}
                required
              />
            </PortalField>
            <PortalField label="Run notes">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={portalInputClass}
                maxLength={1000}
                placeholder="Example: August monthly payroll"
              />
            </PortalField>
            <PortalActionButton type="submit" disabled={creating}>
              <Banknote className="h-4 w-4" />
              {creating ? 'Calculating…' : 'Run Payroll'}
            </PortalActionButton>
          </form>
        </PortalPanel>
      ) : (
        <PortalNotice>
          This portal has read-only payroll access. A Payroll Officer or System Administrator must create and approve runs.
        </PortalNotice>
      )}

      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 sm:grid-cols-3">
          <input
            type="date"
            value={filterFrom}
            onChange={(event) => setFilterFrom(event.target.value)}
            className={portalInputClass}
            aria-label="Filter payroll from date"
          />
          <input
            type="date"
            value={filterTo}
            onChange={(event) => setFilterTo(event.target.value)}
            className={portalInputClass}
            aria-label="Filter payroll to date"
          />
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as PayrollRunStatus | '')}
            className={portalInputClass}
            aria-label="Filter payroll by status"
          >
            <option value="">All statuses</option>
            {PAYROLL_STATUSES.map((status) => (
              <option key={status} value={status}>{status.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>
            ))}
          </select>
        </div>

        {runs.length === 0 ? (
          <PortalEmptyState>
            {loading ? 'Loading payroll runs…' : 'No payroll runs match the selected filters.'}
          </PortalEmptyState>
        ) : (
          <PortalTable>
            <thead>
              <tr>
                <th className={portalThClass}>Period</th>
                <th className={portalThClass}>Status</th>
                <th className={portalThClass}>Employees</th>
                <th className={portalThClass}>Exceptions</th>
                <th className={portalThClass}>Hours</th>
                <th className={portalThClass}>Gross pay</th>
                <th className={portalThClass}>Run date</th>
                <th className={portalThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className={portalTdClass}>
                    <p className="font-semibold">
                      {formatDateOnly(run.periodStart)} – {formatDateOnly(run.periodEnd)}
                    </p>
                    {run.notes ? <p className="mt-1 max-w-xs truncate text-xs text-dark-grey">{run.notes}</p> : null}
                  </td>
                  <td className={portalTdClass}><PortalStatus value={run.status} /></td>
                  <td className={portalTdClass}>
                    <span className="inline-flex items-center gap-2">
                      <UsersRound className="h-4 w-4 text-dark-grey" />
                      {run.employeeCount}
                    </span>
                  </td>
                  <td className={portalTdClass}>{run.exceptionCount}</td>
                  <td className={portalTdClass}>{formatPayrollHours(run.totalHours)}</td>
                  <td className={portalTdClass}>{formatPayrollMoney(run.totalGrossPay)}</td>
                  <td className={portalTdClass}>{formatDateTime(run.runDateUtc)}</td>
                  <td className={portalTdClass}>
                    <Link
                      to={getPayrollRunPath(role, run.id)}
                      className="font-semibold text-dark-grey hover:text-black"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}
