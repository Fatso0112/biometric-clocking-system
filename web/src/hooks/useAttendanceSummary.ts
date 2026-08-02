import { useEffect, useState } from 'react';
import { getAttendanceSummary, type AttendanceSummary } from '../services/attendanceApi';
import type { AttendanceRange } from '../utils/attendanceRanges';

export function useAttendanceSummary(staffNumber: string, range: AttendanceRange) {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    let active = true;
    setSummary(null);

    void getAttendanceSummary(staffNumber, range).then((nextSummary) => {
      if (active) setSummary(nextSummary);
    });

    return () => {
      active = false;
    };
  }, [range.from, range.to, staffNumber]);

  return summary;
}
