import { apiRequest } from './httpClient';

export interface EmployeeProfile {
  name: string;
  staffNumber: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
}

export type EmployeeDirectoryProfile =
  Omit<EmployeeProfile, 'avatarUrl'>;

interface BackendEmployeeProfile {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  departmentId: string;
  departmentName: string;
  workLocationId: string;
  workLocationName: string;
  isActive: boolean;
  createdAtUtc: string;
}

export async function getEmployeeProfile(
  accessToken: string,
): Promise<EmployeeDirectoryProfile> {
  const response =
    await apiRequest<BackendEmployeeProfile>(
      '/api/v1/employees/me',
      { method: 'GET' },
      accessToken,
    );

  return {
    name:
      response.fullName.trim() ||
      `${response.firstName} ${response.lastName}`.trim(),
    staffNumber: response.employeeNumber,
    department: response.departmentName,
    position: 'Employee',
    email: response.email ?? '—',
    phone: response.phoneNumber ?? '—',
  };
}
