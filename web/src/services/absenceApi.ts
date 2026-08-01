import type { TeamMemberRecord } from './teamApi';

export interface TeamClockEvent {
  staffNumber: string;
  date: string;
  clockInTime: string;
}

export interface GetTeamAttendanceSnapshotRequest {
  members: TeamMemberRecord[];
  referenceDate: string;
}

export interface GetTeamAttendanceSnapshotResponse {
  referenceDate: string;
  presentStaffNumbers: string[];
  absentStaffNumbers: string[];
}

const MOCK_DELAY_MS = 250;
const SATURDAY = 6;
const SUNDAY = 0;

// The mock roster deliberately has 20 matching events and five missing events so
// the dashboard data mirrors the accepted design while still being derived by rule.
const MOCK_PRESENT_STAFF_NUMBERS = new Set(
  Array.from({ length: 20 }, (_, index) => `E${String(index + 10001)}`),
);

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWorkingDay(date: Date) {
  return date.getDay() !== SATURDAY && date.getDay() !== SUNDAY;
}

function parseLocalIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getMostRecentWorkingDayOnOrBefore(today = new Date()) {
  // The supervisor snapshot must never use a weekend as its reference day. Walk
  // backwards to the most recent Mon–Fri day so Saturday/Sunday does not read 0/0.
  const referenceDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (!isWorkingDay(referenceDay)) {
    referenceDay.setDate(referenceDay.getDate() - 1);
  }
  return toLocalIsoDate(referenceDay);
}

function buildMockClockEvents(
  members: TeamMemberRecord[],
  referenceDate: string,
): TeamClockEvent[] {
  return members
    .filter((member) => MOCK_PRESENT_STAFF_NUMBERS.has(member.staffNumber))
    .map((member) => ({
      staffNumber: member.staffNumber,
      date: referenceDate,
      clockInTime: `${referenceDate}T08:00:00`,
    }));
}

export async function getTeamAttendanceSnapshot(
  request: GetTeamAttendanceSnapshotRequest,
): Promise<GetTeamAttendanceSnapshotResponse> {
  // MOCK IMPLEMENTATION — this deliberately models only a fixed Mon–Fri schedule.
  // On a working day, a team member without a matching clock event is absent. A real
  // backend must replace this with employee schedules, holidays, leave, and policy data.
  await wait(MOCK_DELAY_MS);

  if (!isWorkingDay(parseLocalIsoDate(request.referenceDate))) {
    return {
      referenceDate: request.referenceDate,
      presentStaffNumbers: [],
      absentStaffNumbers: [],
    };
  }

  const clockEvents = buildMockClockEvents(request.members, request.referenceDate);
  const presentStaffNumbers = new Set(
    clockEvents
      .filter((event) => event.date === request.referenceDate)
      .map((event) => event.staffNumber),
  );

  return {
    referenceDate: request.referenceDate,
    presentStaffNumbers: request.members
      .filter((member) => presentStaffNumbers.has(member.staffNumber))
      .map((member) => member.staffNumber),
    absentStaffNumbers: request.members
      .filter((member) => !presentStaffNumbers.has(member.staffNumber))
      .map((member) => member.staffNumber),
  };
}
