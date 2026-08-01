import { BadgeDollarSign, CircleCheck, WalletCards } from 'lucide-react';
import { useState } from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { usePortalDemo } from '../../hooks/usePortalDemo';
import type { PortalRole } from '../../navigation/portalNavigation';
import { updatePortalPayrollStatus } from '../../services/portalDemoRepository';
import { formatMoney, getDisplayName } from '../../utils/portalFormatters';

export default function PortalPayroll({ role }: { role: PortalRole }) {
  const state = usePortalDemo();
  const { employeeNumber: actorEmployeeNumber } = useSession();
  const [statusFilter, setStatusFilter] = useState('all');
  const employees = new Map(state.employees.map((employee) => [employee.employeeNumber, employee]));
  const records = state.payroll.filter((record) => statusFilter === 'all' || record.status === statusFilter);
  const totalNet = state.payroll.reduce((total, record) => total + record.netPay, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader title="Payroll" description="Frontend demo payroll review. No payment, banking, or backend operation is performed." />
      <MetricGrid>
        <MetricCard label="Payroll records" value={state.payroll.length} icon={<WalletCards className="h-5 w-5" />} />
        <MetricCard label="Net payroll" value={formatMoney(totalNet)} icon={<BadgeDollarSign className="h-5 w-5" />} />
        <MetricCard label="Paid" value={state.payroll.filter((record) => record.status === 'paid').length} icon={<CircleCheck className="h-5 w-5" />} tone="green" />
        <MetricCard label="Pending" value={state.payroll.filter((record) => record.status !== 'paid').length} icon={<WalletCards className="h-5 w-5" />} tone="amber" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="flex justify-end border-b border-light-grey p-4"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${portalInputClass} max-w-52`} aria-label="Filter payroll by status"><option value="all">All statuses</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="paid">Paid</option></select></div>
        <PortalTable>
          <thead><tr><th className={portalThClass}>Employee</th><th className={portalThClass}>Period</th><th className={portalThClass}>Gross</th><th className={portalThClass}>Deductions</th><th className={portalThClass}>Net</th><th className={portalThClass}>Status</th><th className={portalThClass}>Action</th></tr></thead>
          <tbody>{records.map((record) => {
            const employee = employees.get(record.employeeNumber);
            const nextStatus = role === 'admin' ? 'paid' : 'approved';
            return <tr key={record.id}><td className={portalTdClass}><p className="font-semibold">{employee ? getDisplayName(employee.firstName, employee.lastName) : record.employeeNumber}</p><p className="mt-1 text-xs text-dark-grey">{record.employeeNumber}</p></td><td className={portalTdClass}>{record.period}</td><td className={portalTdClass}>{formatMoney(record.grossPay)}</td><td className={portalTdClass}>{formatMoney(record.deductions)}</td><td className={`${portalTdClass} font-semibold`}>{formatMoney(record.netPay)}</td><td className={portalTdClass}><PortalStatus value={record.status} /></td><td className={portalTdClass}><PortalActionButton disabled={record.status === nextStatus || record.status === 'paid'} tone="secondary" className="min-h-9 px-3 text-xs" onClick={() => updatePortalPayrollStatus(record.id, nextStatus, actorEmployeeNumber ?? (role === 'admin' ? '40001' : '30001'))}>{role === 'admin' ? 'Mark paid' : 'Approve'}</PortalActionButton></td></tr>;
          })}</tbody>
        </PortalTable>
      </PortalPanel>
    </div>
  );
}
