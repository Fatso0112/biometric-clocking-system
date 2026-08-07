import type { PortalRole } from '../../navigation/portalNavigation';

export function formatPayrollMoney(value: number | null): string {
  if (value === null) return 'Needs review';

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPayrollHours(value: number): string {
  return `${value.toFixed(2)} h`;
}

export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getPayrollHomePath(role: PortalRole): string {
  switch (role) {
    case 'admin':
      return '/admin/payroll';
    case 'hr':
      return '/hr/payroll';
    case 'payroll':
      return '/payroll/dashboard';
    case 'executive':
      return '/executive/dashboard';
  }
}

export function getPayrollRunPath(
  role: PortalRole,
  payrollRunId: string,
): string {
  switch (role) {
    case 'admin':
      return `/admin/payroll/${payrollRunId}`;
    case 'hr':
      return `/hr/payroll/${payrollRunId}`;
    case 'payroll':
      return `/payroll/runs/${payrollRunId}`;
    case 'executive':
      return `/executive/payroll/${payrollRunId}`;
  }
}

export function canManagePayroll(role: PortalRole): boolean {
  return role === 'admin' || role === 'payroll';
}

export function canApprovePayroll(role: PortalRole): boolean {
  return role === 'admin' || role === 'payroll';
}
