type AttendanceTimestamp = Date | string;

function toTimestamp(value: AttendanceTimestamp) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function getDurationMinutes(start: AttendanceTimestamp, end: AttendanceTimestamp) {
  return Math.max(0, Math.floor((toTimestamp(end) - toTimestamp(start)) / 60_000));
}

export function formatDurationMinutes(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatElapsedDuration(start: AttendanceTimestamp, end: AttendanceTimestamp) {
  return formatDurationMinutes(getDurationMinutes(start, end));
}
