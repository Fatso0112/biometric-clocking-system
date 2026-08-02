import type { TeamMemberRecord } from './teamApi';
import type { AttendanceRecord } from './attendanceApi';
import type { AttendanceRange } from '../utils/attendanceRanges';

export interface TeamAttendanceRow {
  employeeId: string;
  employeeName: string;
  presentDays: number;
  absentDays: number;
  totalHours: string;
}

export interface GetTeamAttendanceRequest {
  members: TeamMemberRecord[];
  range: AttendanceRange;
}

export interface GetTeamAttendanceResponse {
  range: AttendanceRange;
  rows: TeamAttendanceRow[];
}

export interface GetEmployeeAttendanceDetailRequest {
  member: TeamMemberRecord;
  range: AttendanceRange;
}

export interface GetEmployeeAttendanceDetailResponse {
  range: AttendanceRange;
  summary: TeamAttendanceRow;
  records: AttendanceRecord[];
}

type MockDailyClockEvent = {
  employeeId: string;
  date: string;
  clockInMinutes: number;
  workedMinutes: number;
};

const MOCK_DELAY_MS = 300;

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWorkingDates(range: AttendanceRange) {
  const dates: string[] = [];
  const cursor = parseIsoDate(range.from);
  const rangeEnd = parseIsoDate(range.to);

  while (cursor <= rangeEnd) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}h${minutes}m`;
}

function getMemberSeed(employeeId: string) {
  const numericId = Number(employeeId.replace(/\D/g, ''));
  if (Number.isFinite(numericId) && numericId >= 10001) return numericId - 10001;

  return Array.from(employeeId).reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) % 997,
    0,
  );
}

function formatRecordDate(value: string) {
  return parseIsoDate(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRecordTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = String(totalMinutes % 60).padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
}

function buildMockDailyEvents(members: TeamMemberRecord[], workingDates: string[]) {
  const events: MockDailyClockEvent[] = [];

  members.forEach((member) => {
    const memberSeed = getMemberSeed(member.staffNumber);
    const absentDayCount = Math.min((memberSeed % 4) + 1, workingDates.length);
    const absentDayIndexes = new Set(
      Array.from(
        { length: absentDayCount },
        (_, absenceIndex) => (memberSeed * 3 + absenceIndex * 5) % workingDates.length,
      ),
    );

    workingDates.forEach((date, dayIndex) => {
      if (absentDayIndexes.has(dayIndex)) return;
      events.push({
        employeeId: member.staffNumber,
        date,
        clockInMinutes: 7 * 60 + 45 + ((memberSeed * 7 + dayIndex * 3) % 31),
        workedMinutes: 450 + ((memberSeed * 11 + dayIndex * 7) % 51),
      });
    });
  });

  return events;
}

function aggregateAttendanceRow(
  member: TeamMemberRecord,
  workingDates: string[],
  employeeEvents: MockDailyClockEvent[],
): TeamAttendanceRow {
  const presentDates = new Set(employeeEvents.map((event) => event.date));
  const totalMinutes = employeeEvents.reduce((sum, event) => sum + event.workedMinutes, 0);

  return {
    employeeId: member.staffNumber,
    employeeName: member.name,
    presentDays: presentDates.size,
    absentDays: Math.max(workingDates.length - presentDates.size, 0),
    totalHours: formatDuration(totalMinutes),
  };
}

function buildAttendanceRecords(
  workingDates: string[],
  employeeEvents: MockDailyClockEvent[],
): AttendanceRecord[] {
  const eventsByDate = new Map(employeeEvents.map((event) => [event.date, event]));

  return [...workingDates].reverse().map((date) => {
    const event = eventsByDate.get(date);
    const parsedDate = parseIsoDate(date);

    if (!event) {
      return {
        date: formatRecordDate(date),
        day: parsedDate.toLocaleDateString('en-GB', { weekday: 'short' }),
        timeIn: null,
        timeOut: null,
        status: 'absent',
        hours: null,
      };
    }

    return {
      date: formatRecordDate(date),
      day: parsedDate.toLocaleDateString('en-GB', { weekday: 'short' }),
      timeIn: formatRecordTime(event.clockInMinutes),
      timeOut: formatRecordTime(event.clockInMinutes + event.workedMinutes),
      status: event.clockInMinutes > 8 * 60 ? 'late' : 'present',
      hours: formatDuration(event.workedMinutes),
    };
  });
}

export async function getTeamAttendance(
  request: GetTeamAttendanceRequest,
): Promise<GetTeamAttendanceResponse> {
  // MOCK IMPLEMENTATION -- this independently aggregates per-employee day counts
  // across the requested Mon-Fri range. Replace it with the real team attendance
  // endpoint once schedules, leave, holidays, and clock events are backend-owned.
  await wait(MOCK_DELAY_MS);

  const workingDates = getWorkingDates(request.range);
  const clockEvents = buildMockDailyEvents(request.members, workingDates);
  const eventsByEmployee = new Map<string, MockDailyClockEvent[]>();

  for (const event of clockEvents) {
    const employeeEvents = eventsByEmployee.get(event.employeeId) ?? [];
    employeeEvents.push(event);
    eventsByEmployee.set(event.employeeId, employeeEvents);
  }

  return {
    range: { ...request.range },
    rows: request.members.map((member) => {
      const employeeEvents = eventsByEmployee.get(member.staffNumber) ?? [];
      return aggregateAttendanceRow(member, workingDates, employeeEvents);
    }),
  };
}

export async function getEmployeeAttendanceDetail(
  request: GetEmployeeAttendanceDetailRequest,
): Promise<GetEmployeeAttendanceDetailResponse> {
  // MOCK IMPLEMENTATION -- this uses the same Mon-Fri range aggregation as the team
  // table, while exposing daily rows in the established AttendanceRecord shape.
  // Replace it with the real employee attendance endpoint once schedules, leave,
  // holidays, and clock events are backend-owned.
  await wait(MOCK_DELAY_MS);

  const workingDates = getWorkingDates(request.range);
  const employeeEvents = buildMockDailyEvents([request.member], workingDates);

  return {
    range: { ...request.range },
    summary: aggregateAttendanceRow(request.member, workingDates, employeeEvents),
    records: buildAttendanceRecords(workingDates, employeeEvents),
  };
}
