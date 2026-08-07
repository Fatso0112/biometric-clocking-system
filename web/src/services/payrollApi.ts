import { apiRequest } from './httpClient';

export type PayrollRunStatus =
  | 'Draft'
  | 'PendingReview'
  | 'Approved'
  | 'Cancelled';

export interface CreatePayrollRunRequest {
  periodStart: string;
  periodEnd: string;
  notes?: string | null;
}

export interface PayrollRunListItem {
  id: string;
  periodStart: string;
  periodEnd: string;
  runDateUtc: string;
  status: PayrollRunStatus;
  employeeCount: number;
  exceptionCount: number;
  totalHours: number;
  totalGrossPay: number;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAtUtc: string | null;
  notes: string | null;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  workedMinutes: number;
  breakMinutes: number;
  hoursWorked: number;
  rateApplied: number | null;
  grossPay: number | null;
  hasExceptions: boolean;
  notes: string | null;
}

export interface PayrollRun extends PayrollRunListItem {
  entries: PayrollEntry[];
}

export interface PagedPayrollRuns {
  page: number;
  pageSize: number;
  totalCount: number;
  items: PayrollRunListItem[];
}

export interface EmployeePayrollSummaryEntry {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  runDateUtc: string;
  runStatus: PayrollRunStatus;
  hoursWorked: number;
  rateApplied: number | null;
  grossPay: number | null;
  hasExceptions: boolean;
  notes: string | null;
}

export interface EmployeePayrollSummary {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  periodFrom: string | null;
  periodTo: string | null;
  approvedOnly: boolean;
  payrollRunCount: number;
  exceptionCount: number;
  totalHours: number;
  totalGrossPay: number;
  entries: EmployeePayrollSummaryEntry[];
}

export interface GetPayrollRunsParameters {
  from?: string;
  to?: string;
  status?: PayrollRunStatus | '';
  page?: number;
  pageSize?: number;
}

function buildQuery(
  parameters: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();

  Object.entries(parameters).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export function createPayrollRun(
  accessToken: string,
  request: CreatePayrollRunRequest,
): Promise<PayrollRun> {
  return apiRequest<PayrollRun>(
    '/api/v1/payroll/runs',
    {
      method: 'POST',
      body: JSON.stringify({
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        notes: request.notes?.trim() || null,
      }),
    },
    accessToken,
  );
}

export function getPayrollRuns(
  accessToken: string,
  parameters: GetPayrollRunsParameters = {},
): Promise<PagedPayrollRuns> {
  const query = buildQuery({
    from: parameters.from,
    to: parameters.to,
    status: parameters.status,
    page: parameters.page ?? 1,
    pageSize: parameters.pageSize ?? 50,
  });

  return apiRequest<PagedPayrollRuns>(
    `/api/v1/payroll/runs${query}`,
    {},
    accessToken,
  );
}

export function getPayrollRun(
  accessToken: string,
  payrollRunId: string,
): Promise<PayrollRun> {
  return apiRequest<PayrollRun>(
    `/api/v1/payroll/runs/${encodeURIComponent(payrollRunId)}`,
    {},
    accessToken,
  );
}

export function approvePayrollRun(
  accessToken: string,
  payrollRunId: string,
): Promise<PayrollRun> {
  return apiRequest<PayrollRun>(
    `/api/v1/payroll/runs/${encodeURIComponent(payrollRunId)}/approve`,
    { method: 'POST' },
    accessToken,
  );
}

export function getEmployeePayrollSummary(
  accessToken: string,
  employeeId: string,
  parameters: {
    from?: string;
    to?: string;
    approvedOnly?: boolean;
  } = {},
): Promise<EmployeePayrollSummary> {
  const query = buildQuery({
    from: parameters.from,
    to: parameters.to,
    approvedOnly: parameters.approvedOnly,
  });

  return apiRequest<EmployeePayrollSummary>(
    `/api/v1/payroll/employee/${encodeURIComponent(employeeId)}/summary${query}`,
    {},
    accessToken,
  );
}