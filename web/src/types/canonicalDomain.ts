export type EmployeeStatus = 'active' | 'inactive';

export interface CanonicalEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  status: EmployeeStatus;
}

export type Employee = CanonicalEmployee;

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'incomplete';
export type AttendanceSource = 'biometric' | 'manual' | 'imported';
export type AttendanceVerificationResult = 'verified' | 'failed' | 'not-required';

export interface CanonicalAttendance {
  id: string;
  employeeId: string;
  employeeNumber: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  durationMinutes: number | null;
  source: AttendanceSource;
  verificationResult: AttendanceVerificationResult;
}

export type Attendance = CanonicalAttendance;
