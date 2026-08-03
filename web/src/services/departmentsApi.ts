import { apiRequest } from './httpClient';

export interface DepartmentResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface EmployeeDepartmentSummary {
  id: string;
  departmentId: string;
  isActive: boolean;
}

export interface CreateDepartmentRequest {
  name: string;
  description: string | null;
}

export async function getDepartments(
  accessToken: string,
): Promise<DepartmentResponse[]> {
  return apiRequest<DepartmentResponse[]>(
    '/api/v1/departments',
    {
      method: 'GET',
    },
    accessToken,
  );
}

export async function getEmployeeDepartmentSummaries(
  accessToken: string,
): Promise<EmployeeDepartmentSummary[]> {
  return apiRequest<EmployeeDepartmentSummary[]>(
    '/api/v1/employees',
    {
      method: 'GET',
    },
    accessToken,
  );
}

export async function createDepartment(
  request: CreateDepartmentRequest,
  accessToken: string,
): Promise<DepartmentResponse> {
  return apiRequest<DepartmentResponse>(
    '/api/v1/departments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: request.name.trim(),
        description:
          request.description?.trim() || null,
      }),
    },
    accessToken,
  );
}