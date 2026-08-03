import type { AttendanceRange } from '../utils/attendanceRanges';
import { formatDurationMinutes } from '../utils/attendanceDuration';
import { apiRequest } from './httpClient';

export interface AttendanceSummary {
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalHours: string;
  calculationNote?: string;
}

export interface AttendanceRecord {
  date: string;
  day: string;
  timeIn: string | null;
  timeOut: string | null;
  status: 'present' | 'absent' | 'late';
  hours: string | null;
}


export type LiveAttendanceStatus =
  | 'NotPresent'
  | 'Working'
  | 'OnBreak'
  | 'Completed'
  | 'MissingClockOut'
  | 'InvalidSequence';

export type LiveAttendanceAction =
  | 'clockIn'
  | 'breakStart'
  | 'breakEnd'
  | 'clockOut';

export interface TodayAttendanceResponse {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  workDate: string;
  timeZoneId: string;
  status: LiveAttendanceStatus;
  clockInAtUtc: string | null;
  breakStartedAtUtc: string | null;
  breakEndedAtUtc: string | null;
  clockOutAtUtc: string | null;
  lunchDurationMinutes: number;
  workedDurationMinutes: number;
  hasOpenBreak: boolean;
  hasMissingClockOut: boolean;
  hasInvalidSequence: boolean;
}

export interface LiveAttendanceEventResponse {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  eventType: 'ClockIn' | 'BreakStart' | 'BreakEnd' | 'ClockOut';
  verificationMethod: string;
  biometricConfidence: number | null;
  ipAddress: string | null;
  isAllowedNetwork: boolean | null;
  distanceFromWorkLocationMetres: number | null;
  isInsideGeofence: boolean | null;
  capturedAtUtc: string;
  message: string;
}

export interface ClockingLocationEvidence {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  capturedAtUtc: string;
}

export interface RecordLiveAttendanceRequest {
  employeeId: string;
  verificationToken: string;
  location: ClockingLocationEvidence;
}

const LIVE_ATTENDANCE_PATHS: Record<LiveAttendanceAction, string> = {
  clockIn: '/api/v1/attendance/clock-in',
  breakStart: '/api/v1/attendance/break/start',
  breakEnd: '/api/v1/attendance/break/end',
  clockOut: '/api/v1/attendance/clock-out',
};

export async function getTodayAttendance(
  employeeId: string,
  accessToken: string,
): Promise<TodayAttendanceResponse> {
  return apiRequest<TodayAttendanceResponse>(
    `/api/v1/attendance/today/${encodeURIComponent(employeeId)}`,
    { method: 'GET' },
    accessToken,
  );
}

export async function recordLiveAttendance(
  action: LiveAttendanceAction,
  request: RecordLiveAttendanceRequest,
  accessToken: string,
): Promise<LiveAttendanceEventResponse> {
  return apiRequest<LiveAttendanceEventResponse>(
    LIVE_ATTENDANCE_PATHS[action],
    {
      method: 'POST',
      body: JSON.stringify({
        employeeId: request.employeeId,
        clientEventId: crypto.randomUUID(),
        verificationToken: request.verificationToken,
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        locationAccuracyMetres: request.location.accuracyMetres,
        locationCapturedAtUtc: request.location.capturedAtUtc,
      }),
    },
    accessToken,
  );
}

export interface LiveAttendanceBundle {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export async function getMyLiveAttendanceEvents(
  accessToken: string,
  limit = 1000,
): Promise<LiveAttendanceEventResponse[]> {
  return apiRequest<LiveAttendanceEventResponse[]>(
    `/api/v1/attendance/history/me?limit=${Math.max(1, Math.min(limit, 1000))}`,
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

function formatLiveRecordTime(
  value: string | null,
  timeZone: string,
): string | null {
  if (!value) return null;

  return new Intl.DateTimeFormat('en-ZA', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatLiveRecordDate(
  isoDate: string,
  timeZone: string,
): { date: string; day: string } {
  const date = new Date(`${isoDate}T12:00:00Z`);

  return {
    date: new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
    day: new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
    }).format(date),
  };
}

interface BuiltLiveAttendanceRecord {
  record: AttendanceRecord;
  durationMinutes: number | null;
}

function buildLiveRecord(
  workDate: string,
  events: LiveAttendanceEventResponse[],
  timeZone: string,
): BuiltLiveAttendanceRecord | null {
  const orderedEvents = [...events].sort(
    (left, right) =>
      new Date(left.capturedAtUtc).getTime() -
      new Date(right.capturedAtUtc).getTime(),
  );

  const clockIn = orderedEvents.find(
    (event) => event.eventType === 'ClockIn',
  );

  if (!clockIn) return null;

  const clockOut = [...orderedEvents]
    .reverse()
    .find((event) => event.eventType === 'ClockOut');

  let openBreakAt: number | null = null;
  let breakMinutes = 0;

  for (const event of orderedEvents) {
    const capturedAt = new Date(
      event.capturedAtUtc,
    ).getTime();

    if (
      event.eventType === 'BreakStart' &&
      openBreakAt === null
    ) {
      openBreakAt = capturedAt;
      continue;
    }

    if (
      event.eventType === 'BreakEnd' &&
      openBreakAt !== null
    ) {
      breakMinutes += Math.max(
        0,
        Math.round(
          (capturedAt - openBreakAt) / 60_000,
        ),
      );
      openBreakAt = null;
    }
  }

  const durationMinutes = clockOut
    ? Math.max(
        0,
        Math.round(
          (new Date(clockOut.capturedAtUtc).getTime() -
            new Date(clockIn.capturedAtUtc).getTime()) /
            60_000,
        ) - breakMinutes,
      )
    : null;

  const formattedDate = formatLiveRecordDate(
    workDate,
    timeZone,
  );

  return {
    durationMinutes,
    record: {
      date: formattedDate.date,
      day: formattedDate.day,
      timeIn: formatLiveRecordTime(
        clockIn.capturedAtUtc,
        timeZone,
      ),
      timeOut: formatLiveRecordTime(
        clockOut?.capturedAtUtc ?? null,
        timeZone,
      ),
      status: 'present',
      hours:
        durationMinutes === null
          ? null
          : formatDurationMinutes(durationMinutes),
    },
  };
}

export async function getLiveAttendanceBundle(
  employeeId: string,
  accessToken: string,
  range: AttendanceRange,
): Promise<LiveAttendanceBundle> {
  const [today, events] = await Promise.all([
    getTodayAttendance(employeeId, accessToken),
    getMyLiveAttendanceEvents(accessToken),
  ]);

  const grouped = new Map<
    string,
    LiveAttendanceEventResponse[]
  >();

  for (const event of events) {
    const workDate = getIsoDateInTimeZone(
      event.capturedAtUtc,
      today.timeZoneId,
    );

    if (
      workDate < range.from ||
      workDate > range.to
    ) {
      continue;
    }

    const existing = grouped.get(workDate) ?? [];
    existing.push(event);
    grouped.set(workDate, existing);
  }

  const builtRecords = Array.from(grouped.entries())
    .sort(([left], [right]) =>
      right.localeCompare(left),
    )
    .map(([workDate, workDateEvents]) =>
      buildLiveRecord(
        workDate,
        workDateEvents,
        today.timeZoneId,
      ),
    )
    .filter(
      (item): item is BuiltLiveAttendanceRecord =>
        item !== null,
    );

  const records = builtRecords.map(
    (item) => item.record,
  );

  const totalMinutes = builtRecords.reduce(
    (total, item) =>
      total + (item.durationMinutes ?? 0),
    0,
  );

  return {
    records,
    summary: {
      daysPresent: records.length,
      daysAbsent: 0,
      daysLate: 0,
      totalHours: formatDurationMinutes(totalMinutes),
      calculationNote:
        'Absence and lateness require approved shift schedules and are not calculated in this MVP.',
    },
  };
}
