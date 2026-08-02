export type AttendanceRange = {
  from: string;
  to: string;
};

export type AttendanceRangeOption = AttendanceRange & {
  id: 'current-month' | 'previous-month' | 'last-three-months' | 'this-week' | 'last-week';
  label: string;
};

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

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAttendanceRange(range: AttendanceRange) {
  return `${formatDate(parseIsoDate(range.from))} – ${formatDate(parseIsoDate(range.to))}`;
}

export function getAttendanceRangeOptions(now = new Date()): AttendanceRangeOption[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  // Placeholder business convention: attendance weeks run Monday through Sunday.
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const thisWeekStart = new Date(year, month, now.getDate() - daysSinceMonday);
  const thisWeekEnd = new Date(
    thisWeekStart.getFullYear(),
    thisWeekStart.getMonth(),
    thisWeekStart.getDate() + 6,
  );
  const lastWeekStart = new Date(
    thisWeekStart.getFullYear(),
    thisWeekStart.getMonth(),
    thisWeekStart.getDate() - 7,
  );
  const lastWeekEnd = new Date(
    thisWeekStart.getFullYear(),
    thisWeekStart.getMonth(),
    thisWeekStart.getDate() - 1,
  );
  const ranges: Array<Omit<AttendanceRangeOption, 'label'>> = [
    {
      id: 'current-month',
      from: toIsoDate(new Date(year, month, 1)),
      to: toIsoDate(new Date(year, month + 1, 0)),
    },
    {
      id: 'previous-month',
      from: toIsoDate(new Date(year, month - 1, 1)),
      to: toIsoDate(new Date(year, month, 0)),
    },
    {
      id: 'last-three-months',
      from: toIsoDate(new Date(year, month - 2, 1)),
      to: toIsoDate(new Date(year, month + 1, 0)),
    },
    {
      id: 'this-week',
      from: toIsoDate(thisWeekStart),
      to: toIsoDate(thisWeekEnd),
    },
    {
      id: 'last-week',
      from: toIsoDate(lastWeekStart),
      to: toIsoDate(lastWeekEnd),
    },
  ];

  return ranges.map((range) => ({ ...range, label: formatAttendanceRange(range) }));
}
