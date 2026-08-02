import type { AttendanceRange } from '../utils/attendanceRanges';
import {
  formatDurationMinutes,
  formatElapsedDuration,
  getDurationMinutes,
} from '../utils/attendanceDuration';
import { getItem, setItem } from './persistentStore';

export interface AttendanceSummary {
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalHours: string;
}

export interface AttendanceRecord {
  date: string;
  day: string;
  timeIn: string | null;
  timeOut: string | null;
  status: 'present' | 'absent' | 'late';
  hours: string | null;
}

export interface AttendanceEvent {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: AttendanceRecord['status'] | null;
  hours: string | null;
  durationMinutes: number | null;
  source: 'recorded';
}

const LATE_THRESHOLD_HOUR = 8;
const LATE_THRESHOLD_MINUTE = 0;

function getAttendanceStorageKey(staffNumber: string) {
  return `attendance:v1:${encodeURIComponent(staffNumber)}`;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatRecordDate(value: string) {
  return parseIsoDate(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRecordTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isAttendanceEvent(value: unknown): value is AttendanceEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<AttendanceEvent>;
  const validStatus = event.status === null || event.status === 'present' || event.status === 'absent' || event.status === 'late';

  return (
    typeof event.id === 'string' &&
    typeof event.date === 'string' &&
    (event.timeIn === null || typeof event.timeIn === 'string') &&
    (event.timeOut === null || typeof event.timeOut === 'string') &&
    validStatus &&
    (event.hours === null || typeof event.hours === 'string') &&
    (event.durationMinutes === null || typeof event.durationMinutes === 'number') &&
    event.source === 'recorded'
  );
}

function getAttendanceEvents(staffNumber: string) {
  const storageKey = getAttendanceStorageKey(staffNumber);
  const storedEvents = getItem<unknown>(storageKey, 'local');

  if (!Array.isArray(storedEvents)) return [];

  const recordedEvents = storedEvents.filter(isAttendanceEvent);
  if (recordedEvents.length !== storedEvents.length) {
    // Remove seed/demo rows written by older builds without discarding genuine clock events.
    setItem(storageKey, recordedEvents, 'local');
  }
  return recordedEvents;
}

function saveAttendanceEvents(staffNumber: string, events: AttendanceEvent[]) {
  setItem(getAttendanceStorageKey(staffNumber), events, 'local');
}

export function getAttendanceStatus(clockInTime: Date): 'present' | 'late' {
  const threshold = new Date(clockInTime);
  threshold.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MINUTE, 0, 0);
  return clockInTime.getTime() > threshold.getTime() ? 'late' : 'present';
}

export function recordAttendanceClockIn(staffNumber: string, clockInTime: Date): Date {
  const events = getAttendanceEvents(staffNumber);
  const clockInDate = toIsoDate(clockInTime);
  const openRecordedEvent = events.find(
    (event) =>
      event.source === 'recorded' &&
      event.date === clockInDate &&
      event.timeIn !== null &&
      event.timeOut === null,
  );

  // Strict Mode can rerun the confirmation effect; an existing open event makes this write idempotent.
  if (openRecordedEvent?.timeIn) return new Date(openRecordedEvent.timeIn);

  events.push({
    id: `recorded-${encodeURIComponent(staffNumber)}-${clockInTime.toISOString()}`,
    date: clockInDate,
    timeIn: clockInTime.toISOString(),
    timeOut: null,
    status: null,
    hours: null,
    durationMinutes: null,
    source: 'recorded',
  });
  saveAttendanceEvents(staffNumber, events);
  return clockInTime;
}

export function recordAttendanceClockOut(
  staffNumber: string,
  clockInTime: Date,
  clockOutTime: Date,
): AttendanceEvent | null {
  const events = getAttendanceEvents(staffNumber);
  const expectedTimeIn = clockInTime.toISOString();
  let openEventIndex = events.findIndex(
    (event) => event.source === 'recorded' && event.timeIn === expectedTimeIn && event.timeOut === null,
  );

  if (openEventIndex < 0) {
    const clockInDate = toIsoDate(clockInTime);
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.source === 'recorded' && event.date === clockInDate && event.timeIn && event.timeOut === null) {
        openEventIndex = index;
        break;
      }
    }
  }

  if (openEventIndex < 0) return null;

  const openEvent = events[openEventIndex];
  const storedClockInTime = new Date(openEvent.timeIn!);
  const persistedClockOutTime = clockOutTime.toISOString();
  const durationMinutes = getDurationMinutes(openEvent.timeIn!, persistedClockOutTime);
  const completedEvent: AttendanceEvent = {
    ...openEvent,
    timeOut: persistedClockOutTime,
    status: getAttendanceStatus(storedClockInTime),
    hours: formatElapsedDuration(openEvent.timeIn!, persistedClockOutTime),
    durationMinutes,
  };

  events[openEventIndex] = completedEvent;
  saveAttendanceEvents(staffNumber, events);

  // Return the validated record read back from persistence so consumers display the same event History uses.
  return getAttendanceEvents(staffNumber).find((event) => event.id === completedEvent.id) ?? null;
}

function getCompletedEventsInRange(staffNumber: string, range: AttendanceRange) {
  return getAttendanceEvents(staffNumber)
    .filter(
      (event): event is AttendanceEvent & { status: AttendanceRecord['status'] } =>
        event.status !== null && event.date >= range.from && event.date <= range.to,
    )
    .sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date);
      if (dateComparison !== 0) return dateComparison;
      return (right.timeIn ?? '').localeCompare(left.timeIn ?? '');
    });
}

export async function getAttendanceSummary(
  staffNumber: string,
  range: AttendanceRange,
): Promise<AttendanceSummary> {
  const events = getCompletedEventsInRange(staffNumber, range);
  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLate = 0;
  let totalMinutes = 0;

  for (const event of events) {
    if (event.status === 'present') daysPresent += 1;
    if (event.status === 'absent') daysAbsent += 1;
    if (event.status === 'late') daysLate += 1;
    totalMinutes += event.durationMinutes ?? 0;
  }

  return {
    daysPresent,
    daysAbsent,
    daysLate,
    totalHours: formatDurationMinutes(totalMinutes),
  };
}

export async function getAttendanceHistory(
  staffNumber: string,
  range: AttendanceRange,
): Promise<AttendanceRecord[]> {
  return getCompletedEventsInRange(staffNumber, range).map((event) => ({
    date: formatRecordDate(event.date),
    day: parseIsoDate(event.date).toLocaleDateString('en-GB', { weekday: 'short' }),
    timeIn: formatRecordTime(event.timeIn),
    timeOut: formatRecordTime(event.timeOut),
    status: event.status,
    hours: event.hours,
  }));
}
