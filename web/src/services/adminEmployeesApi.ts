import { apiRequest } from './httpClient';

export interface AdminEmployeeResponse {
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

export interface UserAccountResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;

  employeeId: string | null;
  employeeNumber: string | null;
  employeeName: string | null;

  isActive: boolean;
  isLockedOut: boolean;
  lockoutEndUtc: string | null;

  roles: string[];

  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateAdminEmployeeRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  departmentId: string;
  workLocationId: string;
}

export async function createAdminEmployee(
  request: CreateAdminEmployeeRequest,
  accessToken: string,
): Promise<AdminEmployeeResponse> {
  return apiRequest<AdminEmployeeResponse>(
    '/api/v1/employees',
    {
      method: 'POST',
      body: JSON.stringify({
        employeeNumber:
          request.employeeNumber.trim(),

        firstName:
          request.firstName.trim(),

        lastName:
          request.lastName.trim(),

        email:
          request.email?.trim() || null,

        phoneNumber:
          request.phoneNumber?.trim() || null,

        departmentId:
          request.departmentId,

        workLocationId:
          request.workLocationId,
      }),
    },
    accessToken,
  );
}

interface PagedUserAccountsResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  items: UserAccountResponse[];
}

export async function getAdminEmployees(
  accessToken: string,
): Promise<AdminEmployeeResponse[]> {
  return apiRequest<AdminEmployeeResponse[]>(
    '/api/v1/employees',
    {
      method: 'GET',
    },
    accessToken,
  );
}

export async function getAllUserAccounts(
  accessToken: string,
): Promise<UserAccountResponse[]> {
  const accounts: UserAccountResponse[] = [];
  let page = 1;

  while (true) {
    const response =
      await apiRequest<PagedUserAccountsResponse>(
        `/api/v1/users?page=${page}&pageSize=100`,
        {
          method: 'GET',
        },
        accessToken,
      );

    accounts.push(...response.items);

    if (
      accounts.length >= response.totalCount ||
      response.items.length === 0
    ) {
      return accounts;
    }

    page += 1;
  }
}

export async function updateUserAccountStatus(
  userId: string,
  isActive: boolean,
  accessToken: string,
): Promise<UserAccountResponse> {
  return apiRequest<UserAccountResponse>(
    `/api/v1/users/${encodeURIComponent(userId)}/status`,
    {
      method: 'PUT',
      body: JSON.stringify({
        isActive,
      }),
    },
    accessToken,
  );
}