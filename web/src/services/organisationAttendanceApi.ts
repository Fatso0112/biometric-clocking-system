import type { AdminEmployeeResponse } from './adminEmployeesApi';
import type { WorkLocationResponse } from './workLocationsApi';
import { apiRequest } from './httpClient';
import type { LiveAttendanceEventResponse } from './attendanceApi';
import { formatDurationMinutes } from '../utils/attendanceDuration';

export interface AttendanceDashboardResponse {
  registeredEmployees: number;
  currentlyWorking: number;
  onBreak: number;
  completed: number;
  notPresent: number;
  missingClockOut: number;
  generatedAtUtc: string;
  recentActivity: LiveAttendanceEventResponse[];
}

export type AttendanceDayStatus =
  | 'Completed'
  | 'Working'
  | 'OnBreak'
  | 'Incomplete'
  | 'InvalidSequence';

export interface AttendanceDayRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  workLocationName: string;
  workDate: string;
  timeZoneId: string;
  status: AttendanceDayStatus;
  clockInAtUtc: string | null;
  clockOutAtUtc: string | null;
  workedDurationMinutes: number;
  workedDuration: string;
  verificationMethods: string[];
}

export interface EmployeeAttendanceAggregate {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  recordedDays: number;
  completedDays: number;
  openDays: number;
  invalidDays: number;
  workedDurationMinutes: number;
  totalHours: string;
}

export async function getAttendanceDashboard(
  accessToken: string,
): Promise<AttendanceDashboardResponse> {
  return apiRequest<AttendanceDashboardResponse>(
    '/api/v1/attendance/dashboard',
    { method: 'GET' },
    accessToken,
  );
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function getOrganisationAttendanceEvents(
  accessToken: string,
  range: { from: string; to: string },
  employeeId?: string,
): Promise<LiveAttendanceEventResponse[]> {
  const parameters = new URLSearchParams({
    fromUtc: addDays(range.from, -1),
    toUtc: addDays(range.to, 2),
    limit: '10000',
  });

  if (employeeId) {
    parameters.set('employeeId', employeeId);
  }

  return apiRequest<LiveAttendanceEventResponse[]>(
    `/api/v1/attendance/history?${parameters.toString()}`,
    { method: 'GET' },
    accessToken,
  );
}

function getIsoDateInTimeZone(
  value: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));

  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function calculateDay(
  events: LiveAttendanceEventResponse[],
  workDate: string,
  timeZoneId: string,
): Pick<
  AttendanceDayRow,
  | 'status'
  | 'clockInAtUtc'
  | 'clockOutAtUtc'
  | 'workedDurationMinutes'
  | 'verificationMethods'
> {
  const ordered = [...events].sort(
    (left, right) =>
      new Date(left.capturedAtUtc).getTime() -
      new Date(right.capturedAtUtc).getTime(),
  );

  let status: AttendanceDayStatus = 'Incomplete';
  let workStartedAt: number | null = null;
  let breakStartedAt: number | null = null;
  let hasStartedBreak = false;
  let workedDurationMinutes = 0;
  let invalidSequence = false;
  let clockInAtUtc: string | null = null;
  let clockOutAtUtc: string | null = null;

  const autoCloseBreak = (timestamp: number) => {
    if (breakStartedAt === null) {
      return;
    }

    const automaticEndMs =
      breakStartedAt + 60 * 60 * 1000;

    if (timestamp < automaticEndMs) {
      return;
    }

    breakStartedAt = null;
    workStartedAt = automaticEndMs;
    status = 'Working';
  };

  for (const event of ordered) {
    const timestamp = new Date(event.capturedAtUtc).getTime();

    autoCloseBreak(timestamp);

    switch (event.eventType) {
      case 'ClockIn':
        if (workStartedAt !== null || breakStartedAt !== null) {
          invalidSequence = true;
          break;
        }
        clockInAtUtc ??= event.capturedAtUtc;
        workStartedAt = timestamp;
        status = 'Working';
        break;

      case 'BreakStart':
        if (
          workStartedAt === null ||
          breakStartedAt !== null ||
          hasStartedBreak
        ) {
          invalidSequence = true;
          break;
        }
        workedDurationMinutes += Math.max(
          0,
          Math.floor((timestamp - workStartedAt) / 60_000),
        );
        workStartedAt = null;
        breakStartedAt = timestamp;
        hasStartedBreak = true;
        status = 'OnBreak';
        break;

      case 'BreakEnd':
        if (
          breakStartedAt === null &&
          workStartedAt !== null &&
          hasStartedBreak
        ) {
          // The backend may already have auto-ended the
          // one-hour break. A late historical BreakEnd
          // should not invalidate the whole day.
          break;
        }

        if (
          breakStartedAt === null ||
          workStartedAt !== null
        ) {
          invalidSequence = true;
          break;
        }

        breakStartedAt = null;
        workStartedAt = timestamp;
        status = 'Working';
        break;

      case 'ClockOut':
        if (workStartedAt === null || breakStartedAt !== null) {
          invalidSequence = true;
          break;
        }
        workedDurationMinutes += Math.max(
          0,
          Math.floor((timestamp - workStartedAt) / 60_000),
        );
        workStartedAt = null;
        clockOutAtUtc = event.capturedAtUtc;
        status = 'Completed';
        break;

      default:
        invalidSequence = true;
    }
  }

  autoCloseBreak(Date.now());

  if (invalidSequence) {
    status = 'InvalidSequence';
  } else if (!clockInAtUtc) {
    status = 'Incomplete';
  }

  return {
    status,
    clockInAtUtc,
    clockOutAtUtc,
    workedDurationMinutes,
    verificationMethods: Array.from(
      new Set(ordered.map((event) => event.verificationMethod)),
    ),
  };
}

export function buildAttendanceDayRows(
  events: LiveAttendanceEventResponse[],
  employees: AdminEmployeeResponse[],
  workLocations: WorkLocationResponse[],
  range: { from: string; to: string },
): AttendanceDayRow[] {
  const employeesById = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const locationsById = new Map(
    workLocations.map((location) => [location.id, location]),
  );
  const grouped = new Map<string, LiveAttendanceEventResponse[]>();

  for (const event of events) {
    const employee = employeesById.get(event.employeeId);
    if (!employee) continue;

    const timeZoneId =
      locationsById.get(employee.workLocationId)?.timeZoneId ??
      'Africa/Johannesburg';
    const workDate = getIsoDateInTimeZone(
      event.capturedAtUtc,
      timeZoneId,
    );

    if (workDate < range.from || workDate > range.to) {
      continue;
    }

    const key = `${event.employeeId}:${workDate}`;
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([key, dayEvents]) => {
      const firstEvent = dayEvents[0];
      const employee = employeesById.get(firstEvent.employeeId)!;
      const timeZoneId =
        locationsById.get(employee.workLocationId)?.timeZoneId ??
        'Africa/Johannesburg';
      const workDate = key.slice(key.lastIndexOf(':') + 1);
      const calculation = calculateDay(
        dayEvents,
        workDate,
        timeZoneId,
      );

      return {
        id: key,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        departmentName: employee.departmentName,
        workLocationName: employee.workLocationName,
        workDate,
        timeZoneId,
        ...calculation,
        workedDuration: formatDurationMinutes(
          calculation.workedDurationMinutes,
        ),
      };
    })
    .sort((left, right) =>
      right.workDate.localeCompare(left.workDate) ||
      left.employeeName.localeCompare(right.employeeName),
    );
}

export function aggregateAttendanceByEmployee(
  employees: AdminEmployeeResponse[],
  rows: AttendanceDayRow[],
): EmployeeAttendanceAggregate[] {
  const rowsByEmployee = new Map<string, AttendanceDayRow[]>();

  for (const row of rows) {
    rowsByEmployee.set(row.employeeId, [
      ...(rowsByEmployee.get(row.employeeId) ?? []),
      row,
    ]);
  }

  return employees
    .filter((employee) => employee.isActive)
    .map((employee) => {
      const employeeRows = rowsByEmployee.get(employee.id) ?? [];
      const workedDurationMinutes = employeeRows.reduce(
        (total, row) => total + row.workedDurationMinutes,
        0,
      );

      return {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        departmentName: employee.departmentName,
        recordedDays: employeeRows.length,
        completedDays: employeeRows.filter(
          (row) => row.status === 'Completed',
        ).length,
        openDays: employeeRows.filter(
          (row) => row.status === 'Working' || row.status === 'OnBreak',
        ).length,
        invalidDays: employeeRows.filter(
          (row) => row.status === 'InvalidSequence' || row.status === 'Incomplete',
        ).length,
        workedDurationMinutes,
        totalHours: formatDurationMinutes(workedDurationMinutes),
      };
    })
    .sort((left, right) =>
      left.employeeName.localeCompare(right.employeeName),
    );
}

export function formatAttendanceTime(
  value: string | null,
  timeZoneId = 'Africa/Johannesburg',
): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: timeZoneId,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
