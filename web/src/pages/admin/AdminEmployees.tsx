import {
  Coffee,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  MetricCard,
  MetricGrid,
  PortalActionButton,
  PortalEmptyState,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import {
  getAdminEmployees,
  getAllUserAccounts,
  updateUserAccountStatus,
  type AdminEmployeeResponse,
  type UserAccountResponse,
} from '../../services/adminEmployeesApi';
import {
  getDepartments,
  type DepartmentResponse,
} from '../../services/departmentsApi';
import { ApiError } from '../../services/httpClient';
import { getTodayAttendance } from '../../services/attendanceApi';
import { overrideLunchBreak } from '../../services/lunchBreakOverrideApi';
import { Link } from 'react-router-dom';

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your login session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to manage employee accounts.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The request could not be completed.';
}

function formatRole(role: string): string {
  const knownRoles: Record<string, string> = {
    Employee: 'Employee',
    Supervisor: 'Supervisor',
    HROfficer: 'HR Officer',
    PayrollOfficer: 'Payroll Officer',
    SystemAdministrator: 'System Administrator',
    ExecutiveViewer: 'Executive Viewer',
  };

  return knownRoles[role] ?? role;
}

export default function AdminEmployees() {
  const { accessToken } = useSession();

  const [employees, setEmployees] = useState<
    AdminEmployeeResponse[]
  >([]);

  const [departments, setDepartments] = useState<
    DepartmentResponse[]
  >([]);

  const [userAccounts, setUserAccounts] = useState<
    UserAccountResponse[]
  >([]);


  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] =
    useState('all');
  const [status, setStatus] = useState('all');

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    updatingUserId,
    setUpdatingUserId,
  ] = useState<string | null>(null);

  const [
    updatingLunchEmployeeId,
    setUpdatingLunchEmployeeId,
  ] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const loadEmployees =
    useCallback(async () => {
      if (!accessToken) {
        setMessage({
          text: 'No authenticated session was found. Please log in again.',
          error: true,
        });

        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const [
          employeeResponse,
          departmentResponse,
          accountResponse,
        ] = await Promise.all([
          getAdminEmployees(accessToken),
          getDepartments(accessToken),
          getAllUserAccounts(accessToken),
        ]);


        setEmployees(employeeResponse);
        setDepartments(departmentResponse);
        setUserAccounts(accountResponse);
      } catch (error) {
        setMessage({
          text: getErrorMessage(error),
          error: true,
        });
      } finally {
        setIsLoading(false);
      }
    }, [accessToken]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const accountByEmployeeId =
    useMemo(() => {
      const accounts = new Map<
        string,
        UserAccountResponse
      >();

      for (const account of userAccounts) {
        if (account.employeeId) {
          accounts.set(
            account.employeeId,
            account,
          );
        }
      }

      return accounts;
    }, [userAccounts]);

  const filteredEmployees =
    useMemo(() => {
      const normalizedQuery =
        query.trim().toLowerCase();

      return employees.filter((employee) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            employee.employeeNumber,
            employee.firstName,
            employee.lastName,
            employee.email ?? '',
            employee.departmentName,
            employee.workLocationName,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(normalizedQuery),
          );

        const matchesDepartment =
          departmentId === 'all' ||
          employee.departmentId ===
            departmentId;

        const matchesStatus =
          status === 'all' ||
          (status === 'active'
            ? employee.isActive
            : !employee.isActive);

        return (
          matchesQuery &&
          matchesDepartment &&
          matchesStatus
        );
      });
    }, [
      departmentId,
      employees,
      query,
      status,
    ]);

  const activeEmployeeCount =
    employees.filter(
      (employee) => employee.isActive,
    ).length;

  const linkedAccountCount =
    employees.filter((employee) =>
      accountByEmployeeId.has(employee.id),
    ).length;

  async function handleAccountStatusChange(
    account: UserAccountResponse,
  ) {
    if (!accessToken) {
      setMessage({
        text: 'Your login session is unavailable. Please log in again.',
        error: true,
      });

      return;
    }

    const nextStatus = !account.isActive;

    const confirmed = window.confirm(
      nextStatus
        ? `Enable login access for ${account.firstName} ${account.lastName}?`
        : `Disable login access for ${account.firstName} ${account.lastName}?`,
    );

    if (!confirmed) {
      return;
    }

    setUpdatingUserId(account.id);
    setMessage(null);

    try {
      const updatedAccount =
        await updateUserAccountStatus(
          account.id,
          nextStatus,
          accessToken,
        );

      setUserAccounts((current) =>
        current.map((item) =>
          item.id === updatedAccount.id
            ? updatedAccount
            : item,
        ),
      );

      setMessage({
        text: nextStatus
          ? 'Login access enabled successfully.'
          : 'Login access disabled successfully.',
        error: false,
      });
    } catch (error) {
      setMessage({
        text: getErrorMessage(error),
        error: true,
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleLunchOverride(
    employee: AdminEmployeeResponse,
  ) {
    if (!accessToken) {
      setMessage({
        text: 'Your login session is unavailable. Please log in again.',
        error: true,
      });
      return;
    }

    setUpdatingLunchEmployeeId(
      employee.id,
    );
    setMessage(null);

    try {
      const today =
        await getTodayAttendance(
          employee.id,
          accessToken,
        );

      let action:
        | 'Start'
        | 'End';

      if (today.status === 'OnBreak') {
        action = 'End';
      } else if (
        today.status === 'Working' &&
        !today.hasTakenLunchBreak
      ) {
        action = 'Start';
      } else {
        setMessage({
          text: today.hasTakenLunchBreak
            ? `${employee.fullName}'s lunch break has already been completed today.`
            : `${employee.fullName} must be actively working before a lunch break can be overridden.`,
          error: true,
        });
        return;
      }

      const reason =
        window.prompt(
          `${action} lunch break for ${employee.fullName}.\n\nEnter the reason for this administrator override:`,
        )?.trim();

      if (!reason) {
        return;
      }

      if (reason.length < 3) {
        setMessage({
          text: 'The override reason must contain at least 3 characters.',
          error: true,
        });
        return;
      }

      const result =
        await overrideLunchBreak(
          accessToken,
          {
            employeeId:
              employee.id,
            action,
            reason,
          },
        );

      setMessage({
        text:
          action === 'Start'
            ? `Lunch break started for ${result.employeeName}. It will end automatically after ${result.lunchBreakMaximumMinutes} minutes unless ended earlier.`
            : `Lunch break ended for ${result.employeeName}.`,
        error: false,
      });
    } catch (error) {
      setMessage({
        text: getErrorMessage(error),
        error: true,
      });
    } finally {
      setUpdatingLunchEmployeeId(
        null,
      );
    }
  }


  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Employees"
        description="View live employee records, departments, work locations, roles and account access. Employees register their own device authenticator from their profile."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/employees/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-card bg-black px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add employee
            </Link>

            <PortalActionButton
              tone="secondary"
              onClick={() => {
                void loadEmployees();
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </PortalActionButton>
          </div>
        }
      />

      <MetricGrid>
        <MetricCard
          label="Total employees"
          value={
            isLoading
              ? '—'
              : employees.length
          }
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Active records"
          value={
            isLoading
              ? '—'
              : activeEmployeeCount
          }
          icon={
            <UserCheck className="h-5 w-5" />
          }
          tone="green"
        />

        <MetricCard
          label="Departments"
          value={
            isLoading
              ? '—'
              : departments.length
          }
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Login accounts"
          value={
            isLoading
              ? '—'
              : linkedAccountCount
          }
          icon={
            <ShieldCheck className="h-5 w-5" />
          }
        />
      </MetricGrid>

      {message ? (
        <PortalNotice
          tone={
            message.error
              ? 'error'
              : 'success'
          }
        >
          {message.text}
        </PortalNotice>
      ) : null}

      <PortalPanel className="mt-6">
        <div className="grid gap-3 border-b border-light-grey p-4 md:grid-cols-[minmax(240px,1fr)_220px_180px]">
          <label className="relative">
            <span className="sr-only">
              Search employees
            </span>

            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search name, employee no. or email"
              className={`${portalInputClass} pl-11`}
            />
          </label>

          <select
            value={departmentId}
            onChange={(event) =>
              setDepartmentId(
                event.target.value,
              )
            }
            className={portalInputClass}
            aria-label="Filter by department"
          >
            <option value="all">
              All departments
            </option>

            {departments.map(
              (department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              ),
            )}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className={portalInputClass}
            aria-label="Filter by status"
          >
            <option value="all">
              All statuses
            </option>
            <option value="active">
              Active
            </option>
            <option value="inactive">
              Inactive
            </option>
          </select>
        </div>

        {isLoading ? (
          <PortalEmptyState>
            Loading employees…
          </PortalEmptyState>
        ) : filteredEmployees.length === 0 ? (
          <PortalEmptyState>
            {employees.length === 0
              ? 'No employees have been created yet.'
              : 'No employees match these filters.'}
          </PortalEmptyState>
        ) : (
          <PortalTable>
            <thead>
              <tr>
                <th className={portalThClass}>
                  Employee
                </th>
                <th className={portalThClass}>
                  Employee No.
                </th>
                <th className={portalThClass}>
                  Department
                </th>
                <th className={portalThClass}>
                  Work location
                </th>
                <th className={portalThClass}>
                  Roles
                </th>
                <th className={portalThClass}>
                  Record
                </th>
                <th className={portalThClass}>
                  Login
                </th>
                <th className={portalThClass}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map(
                (employee) => {
                  const account =
                    accountByEmployeeId.get(
                      employee.id,
                    );


                  return (
                    <tr key={employee.id}>
                      <td
                        className={
                          portalTdClass
                        }
                      >
                        <p className="font-semibold">
                          {employee.fullName}
                        </p>

                        <p className="mt-1 text-xs text-dark-grey">
                          {employee.email ??
                            'No email address'}
                        </p>
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {employee.employeeNumber}
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {employee.departmentName}
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {employee.workLocationName}
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {account?.roles.length
                          ? account.roles
                              .map(formatRole)
                              .join(', ')
                          : 'None'}
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        <PortalStatus
                          value={
                            employee.isActive
                              ? 'Active'
                              : 'Inactive'
                          }
                        />
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {account ? (
                          <PortalStatus
                            value={
                              account.isLockedOut
                                ? 'Locked'
                                : account.isActive
                                  ? 'Active'
                                  : 'Inactive'
                            }
                          />
                        ) : (
                          <PortalStatus value="No account" />
                        )}
                      </td>


                      <td
                        className={
                          portalTdClass
                        }
                      >
                        <div className="flex min-w-[150px] flex-col gap-2">
                          {employee.isActive ? (
                            <PortalActionButton
                              tone="secondary"
                              className="min-h-10 px-3 text-xs"
                              disabled={
                                updatingLunchEmployeeId ===
                                employee.id
                              }
                              onClick={() => {
                                void handleLunchOverride(
                                  employee,
                                );
                              }}
                            >
                              <Coffee className="h-4 w-4" />
                              {updatingLunchEmployeeId ===
                              employee.id
                                ? 'Checking lunch…'
                                : 'Override lunch'}
                            </PortalActionButton>
                          ) : null}

                          {account ? (
                            <PortalActionButton
                              tone={
                                account.isActive
                                  ? 'danger'
                                  : 'secondary'
                              }
                              className="min-h-10 px-3 text-xs"
                              disabled={
                                updatingUserId ===
                                account.id
                              }
                              onClick={() => {
                                void handleAccountStatusChange(
                                  account,
                                );
                              }}
                            >
                              {updatingUserId ===
                              account.id
                                ? 'Saving…'
                                : account.isActive
                                  ? 'Disable login'
                                  : 'Enable login'}
                            </PortalActionButton>
                          ) : (
                            <span className="text-xs text-dark-grey">
                              No login account
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}