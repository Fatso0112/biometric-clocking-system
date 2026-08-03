import { useEffect, useState } from 'react';
import {
  getLiveAttendanceBundle,
  type AttendanceSummary,
} from '../services/attendanceApi';
import type { AttendanceRange } from '../utils/attendanceRanges';

export function useAttendanceSummary(
  employeeId: string | null,
  accessToken: string | null,
  range: AttendanceRange,
) {
  const [summary, setSummary] =
    useState<AttendanceSummary | null>(null);

  useEffect(() => {
    let active = true;
    setSummary(null);

    if (!employeeId || !accessToken) {
      return () => {
        active = false;
      };
    }

    void getLiveAttendanceBundle(
      employeeId,
      accessToken,
      range,
    )
      .then((bundle) => {
        if (active) {
          setSummary(bundle.summary);
        }
      })
      .catch(() => {
        if (active) {
          setSummary({
            daysPresent: 0,
            daysAbsent: 0,
            daysLate: 0,
            totalHours: '0m',
            calculationNote:
              'Attendance data could not be loaded.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    employeeId,
    range.from,
    range.to,
  ]);

  return summary;
}
