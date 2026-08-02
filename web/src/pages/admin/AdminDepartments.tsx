import {
  Building2,
  Plus,
  RefreshCw,
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
  PortalField,
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
  createDepartment,
  getDepartments,
  getEmployeeDepartmentSummaries,
  type DepartmentResponse,
  type EmployeeDepartmentSummary,
} from '../../services/departmentsApi';
import { ApiError } from '../../services/httpClient';

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your login session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to manage departments.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The request could not be completed.';
}

export default function AdminDepartments() {
  const { accessToken } = useSession();

  const [
    departments,
    setDepartments,
  ] = useState<DepartmentResponse[]>([]);

  const [
    employees,
    setEmployees,
  ] = useState<
    EmployeeDepartmentSummary[]
  >([]);

  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const loadDepartments =
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

      try {
        const [
          departmentResponse,
          employeeResponse,
        ] = await Promise.all([
          getDepartments(accessToken),
          getEmployeeDepartmentSummaries(
            accessToken,
          ),
        ]);

        setDepartments(departmentResponse);
        setEmployees(employeeResponse);
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
    void loadDepartments();
  }, [loadDepartments]);

  const employeeCountByDepartment =
    useMemo(() => {
      const counts = new Map<
        string,
        number
      >();

      for (const employee of employees) {
        const currentCount =
          counts.get(
            employee.departmentId,
          ) ?? 0;

        counts.set(
          employee.departmentId,
          currentCount + 1,
        );
      }

      return counts;
    }, [employees]);

  const assignedEmployeeCount =
    employees.filter(
      (employee) =>
        Boolean(employee.departmentId),
    ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Departments"
        description="Maintain the live department directory stored in the attendance system database."
        actions={
          <PortalActionButton
            tone="secondary"
            onClick={() => {
              setMessage(null);
              void loadDepartments();
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
        }
      />

      <MetricGrid>
        <MetricCard
          label="Departments"
          value={
            isLoading
              ? '—'
              : departments.length
          }
          icon={
            <Building2 className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Employees assigned"
          value={
            isLoading
              ? '—'
              : assignedEmployeeCount
          }
          icon={
            <Building2 className="h-5 w-5" />
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PortalPanel>
          <PortalTable>
            <thead>
              <tr>
                <th className={portalThClass}>
                  Department
                </th>

                <th className={portalThClass}>
                  Description
                </th>

                <th className={portalThClass}>
                  Status
                </th>

                <th className={portalThClass}>
                  Employees
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-sm text-dark-grey"
                  >
                    Loading departments…
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-sm text-dark-grey"
                  >
                    No departments have been
                    created yet.
                  </td>
                </tr>
              ) : (
                departments.map(
                  (department) => (
                    <tr key={department.id}>
                      <td
                        className={
                          portalTdClass
                        }
                      >
                        <span className="font-semibold">
                          {department.name}
                        </span>
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        {department.description ??
                          'No description'}
                      </td>

                      <td
                        className={
                          portalTdClass
                        }
                      >
                        <PortalStatus
                          value={
                            department.isActive
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
                        {employeeCountByDepartment.get(
                          department.id,
                        ) ?? 0}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </PortalTable>
        </PortalPanel>

        <PortalPanel className="p-5">
          <h2 className="font-bold">
            Add department
          </h2>

          <p className="mt-2 text-xs leading-5 text-dark-grey">
            The department will be saved
            directly to the Railway
            PostgreSQL database.
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage(null);

              if (!accessToken) {
                setMessage({
                  text: 'Your login session is unavailable. Please log in again.',
                  error: true,
                });

                return;
              }

              const normalizedName =
                name.trim();

              if (!normalizedName) {
                setMessage({
                  text: 'Enter a department name.',
                  error: true,
                });

                return;
              }

              setIsSaving(true);

              try {
                await createDepartment(
                  {
                    name: normalizedName,
                    description:
                      description.trim() ||
                      null,
                  },
                  accessToken,
                );

                setName('');
                setDescription('');

                setMessage({
                  text: 'Department added successfully.',
                  error: false,
                });

                await loadDepartments();
              } catch (error) {
                setMessage({
                  text: getErrorMessage(error),
                  error: true,
                });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <PortalField label="Department name">
              <input
                required
                maxLength={150}
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                className={
                  portalInputClass
                }
                placeholder="e.g. Human Resources"
              />
            </PortalField>

            <PortalField label="Description">
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                className={`${portalInputClass} min-h-28 py-3`}
                placeholder="Optional department description"
              />
            </PortalField>

            <PortalActionButton
              type="submit"
              className="w-full"
              disabled={isSaving}
            >
              <Plus className="h-4 w-4" />

              {isSaving
                ? 'Adding…'
                : 'Add department'}
            </PortalActionButton>
          </form>
        </PortalPanel>
      </div>
    </div>
  );
}