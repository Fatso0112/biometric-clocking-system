import { X } from 'lucide-react';
import { useEffect } from 'react';
import {
  PortalActionButton,
  PortalStatus,
} from '../../components/portal/PortalUi';
import type {
  PayrollEntry,
  PayrollRun,
} from '../../services/payrollApi';
import {
  formatDateOnly,
  formatPayrollHours,
  formatPayrollMoney,
} from './payrollPresentation';

interface PayrollEntryPayslipModalProps {
  run: PayrollRun;
  entry: PayrollEntry;
  onClose: () => void;
}

export default function PayrollEntryPayslipModal({
  run,
  entry,
  onClose,
}: PayrollEntryPayslipModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-item"
      >
        <header className="flex items-start justify-between gap-4 border-b border-light-grey px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dark-grey">
              Payroll statement
            </p>
            <h2 id="payslip-title" className="mt-1 text-xl font-bold">
              {entry.employeeName}
            </h2>
            <p className="mt-1 text-sm text-dark-grey">
              {entry.employeeNumber} · {entry.departmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-light-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            aria-label="Close payroll statement"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 rounded-card border border-light-grey bg-cream-white/60 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-dark-grey">Payroll period</p>
              <p className="mt-1 font-semibold">
                {formatDateOnly(run.periodStart)} – {formatDateOnly(run.periodEnd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-grey">Run status</p>
              <div className="mt-1"><PortalStatus value={run.status} /></div>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-light-grey rounded-card border border-light-grey">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-dark-grey">Worked time</dt>
              <dd className="font-semibold">{formatPayrollHours(entry.hoursWorked)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-dark-grey">Break time</dt>
              <dd className="font-semibold">{entry.breakMinutes} minutes</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-dark-grey">Hourly rate applied</dt>
              <dd className="font-semibold">{formatPayrollMoney(entry.rateApplied)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <dt className="font-semibold">Gross pay</dt>
              <dd className="text-xl font-bold">{formatPayrollMoney(entry.grossPay)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-start justify-between gap-4 rounded-card border border-light-grey p-4">
            <div>
              <p className="text-xs text-dark-grey">Entry result</p>
              <div className="mt-2">
                <PortalStatus value={entry.hasExceptions ? 'Needs Review' : 'Calculated'} />
              </div>
            </div>
            {entry.notes ? (
              <p className="max-w-md text-right text-sm leading-6 text-dark-grey">
                {entry.notes}
              </p>
            ) : null}
          </div>

          <p className="mt-5 text-xs leading-5 text-dark-grey">
            This is a gross-pay preview, not a statutory payslip. Tax, deductions,
            benefits and net pay are not included in the current payroll phase.
          </p>

          <div className="mt-6 flex justify-end">
            <PortalActionButton tone="secondary" onClick={onClose}>
              Close
            </PortalActionButton>
          </div>
        </div>
      </section>
    </div>
  );
}
