import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Download,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import type { PortalRole } from '../../navigation/portalNavigation';
import { ApiError } from '../../services/httpClient';
import {
  approvePayrollRun,
  getPayrollRun,
  type PayrollEntry,
  type PayrollRun,
} from '../../services/payrollApi';
import { downloadCsv } from '../../utils/portalFormatters';
import PayrollEntryPayslipModal from './PayrollEntryPayslipModal';
import {
  canApprovePayroll,
  formatDateOnly,
  formatDateTime,
  formatPayrollHours,
  formatPayrollMoney,
  getPayrollHomePath,
} from './payrollPresentation';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The payroll run could not be loaded.';
}

export default function PayrollRunDetails({ role }: { role: PortalRole }) {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useSession();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mayApprove = canApprovePayroll(role);

  const loadRun = useCallback(async () => {
    if (!accessToken || !id) return;

    setLoading(true);
    setError(null);

    try {
      setRun(await getPayrollRun(accessToken, id));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  if (!id) {
    return <PortalNotice tone="error">The payroll run ID is missing.</PortalNotice>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Link
          to={getPayrollHomePath(role)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-dark-grey hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payroll runs
        </Link>
      </div>

      <PortalPageHeader
        title="Payroll run details"
        description={run
          ? `${formatDateOnly(run.periodStart)} – ${formatDateOnly(run.periodEnd)}`
          : 'Review employee calculations, exceptions and approval status.'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <PortalActionButton
              tone="secondary"
              disabled={loading}
              onClick={() => void loadRun()}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </PortalActionButton>

            <PortalActionButton
              tone="secondary"
              disabled={!run}
              onClick={() => {
                if (!run) return;
                downloadCsv(
                  `payroll-${run.periodStart}-to-${run.periodEnd}.csv`,
                  [
                    'Employee',
                    'Employee Number',
                    'Department',
                    'Worked Minutes',
                    'Break Minutes',
                    'Hours Worked',
                    'Rate Applied',
                    'Gross Pay',
                    'Has Exceptions',
                    'Notes',
                  ],
                  run.entries.map((entry) => [
                    entry.employeeName,
                    entry.employeeNumber,
                    entry.departmentName,
                    entry.workedMinutes,
                    entry.breakMinutes,
                    entry.hoursWorked,
                    entry.rateApplied,
                    entry.grossPay,
                    entry.hasExceptions ? 'Yes' : 'No',
                    entry.notes,
                  ]),
                );
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </PortalActionButton>

            {mayApprove && run?.status === 'Draft' ? (
              <PortalActionButton
                disabled={approving}
                onClick={async () => {
                  if (!accessToken || !run) return;

                  const confirmed = window.confirm(
                    'Approve this payroll run? Approved payroll cannot be recalculated silently.',
                  );
                  if (!confirmed) return;

                  setApproving(true);
                  setError(null);
                  setSuccess(null);

                  try {
                    const approved = await approvePayrollRun(accessToken, run.id);
                    setRun(approved);
                    setSuccess('Payroll run approved successfully.');
                  } catch (approveError) {
                    setError(getErrorMessage(approveError));
                  } finally {
                    setApproving(false);
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {approving ? 'Approving…' : 'Approve Payroll'}
              </PortalActionButton>
            ) : null}
          </div>
        )}
      />

      {error ? <PortalNotice tone="error">{error}</PortalNotice> : null}
      {success ? <PortalNotice>{success}</PortalNotice> : null}

      {run?.status === 'PendingReview' ? (
        <PortalNotice tone="error">
          This payroll run contains attendance or pay-rate exceptions. Resolve them and create a new run before approval.
        </PortalNotice>
      ) : null}

      {run ? (
        <>
          <MetricGrid>
            <MetricCard
              label="Employees"
              value={run.employeeCount}
              icon={<UsersRound className="h-5 w-5" />}
            />
            <MetricCard
              label="Total hours"
              value={formatPayrollHours(run.totalHours)}
              icon={<Banknote className="h-5 w-5" />}
            />
            <MetricCard
              label="Gross pay"
              value={formatPayrollMoney(run.totalGrossPay)}
              icon={<Banknote className="h-5 w-5" />}
              tone="green"
            />
            <MetricCard
              label="Exceptions"
              value={run.exceptionCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={run.exceptionCount > 0 ? 'amber' : 'green'}
            />
          </MetricGrid>

          <PortalPanel className="mt-6 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-dark-grey">Status</p>
                <div className="mt-2"><PortalStatus value={run.status} /></div>
              </div>
              <div>
                <p className="text-xs text-dark-grey">Run date</p>
                <p className="mt-2 font-semibold">{formatDateTime(run.runDateUtc)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-grey">Approved at</p>
                <p className="mt-2 font-semibold">{formatDateTime(run.approvedAtUtc)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-grey">Notes</p>
                <p className="mt-2 text-sm font-semibold">{run.notes || '—'}</p>
              </div>
            </div>
          </PortalPanel>

          <PortalPanel className="mt-6">
            {run.entries.length === 0 ? (
              <PortalEmptyState>No payroll entries were created for this run.</PortalEmptyState>
            ) : (
              <PortalTable>
                <thead>
                  <tr>
                    <th className={portalThClass}>Employee</th>
                    <th className={portalThClass}>Department</th>
                    <th className={portalThClass}>Worked</th>
                    <th className={portalThClass}>Break</th>
                    <th className={portalThClass}>Rate</th>
                    <th className={portalThClass}>Gross pay</th>
                    <th className={portalThClass}>Result</th>
                    <th className={portalThClass}>Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {run.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className={portalTdClass}>
                        <p className="font-semibold">{entry.employeeName}</p>
                        <p className="mt-1 text-xs text-dark-grey">{entry.employeeNumber}</p>
                      </td>
                      <td className={portalTdClass}>{entry.departmentName}</td>
                      <td className={portalTdClass}>{formatPayrollHours(entry.hoursWorked)}</td>
                      <td className={portalTdClass}>{entry.breakMinutes} min</td>
                      <td className={portalTdClass}>{formatPayrollMoney(entry.rateApplied)}</td>
                      <td className={portalTdClass}>{formatPayrollMoney(entry.grossPay)}</td>
                      <td className={portalTdClass}>
                        <PortalStatus value={entry.hasExceptions ? 'Needs Review' : 'Calculated'} />
                        {entry.notes ? (
                          <p className="mt-2 max-w-xs text-xs leading-5 text-dark-grey">{entry.notes}</p>
                        ) : null}
                      </td>
                      <td className={portalTdClass}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="font-semibold text-dark-grey hover:text-black"
                        >
                          View statement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTable>
            )}
          </PortalPanel>
        </>
      ) : loading ? (
        <PortalPanel className="mt-6">
          <PortalEmptyState>Loading payroll run…</PortalEmptyState>
        </PortalPanel>
      ) : null}

      {run && selectedEntry ? (
        <PayrollEntryPayslipModal
          run={run}
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      ) : null}
    </div>
  );
}
