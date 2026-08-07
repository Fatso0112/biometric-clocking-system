import { apiRequest } from './httpClient';

export type LunchBreakOverrideAction =
  | 'Start'
  | 'End';

export interface LunchBreakOverrideRequest {
  employeeId: string;
  action: LunchBreakOverrideAction;
  reason: string;
}

export interface LunchBreakOverrideResponse {
  attendanceEventId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  action: LunchBreakOverrideAction;
  status: 'OnBreak' | 'Working';
  occurredAtUtc: string;
  lunchBreakEndsAtUtc: string | null;
  lunchBreakMaximumMinutes: number;
  performedByRole: string;
  performedByUserId: string;
  reason: string;
}

export async function overrideLunchBreak(
  accessToken: string,
  request: LunchBreakOverrideRequest,
): Promise<LunchBreakOverrideResponse> {
  return apiRequest<LunchBreakOverrideResponse>(
    '/api/v1/attendance/break/override',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
    accessToken,
  );
}
