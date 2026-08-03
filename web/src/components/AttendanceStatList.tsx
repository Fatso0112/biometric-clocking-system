import {
  CheckCircle2,
  Clock3,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AttendanceSummary } from '../services/attendanceApi';

type AttendanceStatListProps = {
  summary: AttendanceSummary | null;
};

type AttendanceStatRow = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
  valueClassName: string;
};

export default function AttendanceStatList({
  summary,
}: AttendanceStatListProps) {
  const rows: AttendanceStatRow[] = [
    {
      label: 'Days with Clock-in',
      value: summary
        ? String(summary.daysPresent)
        : '—',
      icon: CheckCircle2,
      iconClassName: 'text-status-green',
      iconBackgroundClassName:
        'bg-status-green-soft',
      valueClassName: 'text-status-green',
    },
    {
      label: 'Days Absent',
      value: summary ? 'N/A' : '—',
      icon: XCircle,
      iconClassName: 'text-status-red',
      iconBackgroundClassName:
        'bg-status-red-soft',
      valueClassName: 'text-status-red',
    },
    {
      label: 'Days Late',
      value: summary ? 'N/A' : '—',
      icon: Clock3,
      iconClassName: 'text-status-amber',
      iconBackgroundClassName:
        'bg-status-amber-soft',
      valueClassName: 'text-status-amber',
    },
    {
      label: 'Recorded Working Hours',
      value: summary?.totalHours ?? '—',
      icon: Clock3,
      iconClassName: 'text-black',
      iconBackgroundClassName:
        'bg-light-grey/70',
      valueClassName: 'text-black',
    },
  ];

  return (
    <>
      <div className="divide-y divide-light-grey">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="flex min-h-16 items-center gap-3 py-3"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card ${row.iconBackgroundClassName}`}
                aria-hidden="true"
              >
                <Icon
                  className={`h-6 w-6 ${row.iconClassName}`}
                  strokeWidth={1.5}
                />
              </span>
              <span className="min-w-0 flex-1 text-sm text-black">
                {row.label}
              </span>
              <span
                className={`shrink-0 text-base font-bold ${row.valueClassName}`}
              >
                {row.value}
              </span>
            </div>
          );
        })}
      </div>

      {summary?.calculationNote ? (
        <p className="mt-3 text-xs leading-5 text-dark-grey">
          {summary.calculationNote}
        </p>
      ) : null}
    </>
  );
}
