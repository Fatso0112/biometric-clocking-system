import {
  ArrowLeft,
  Save,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  PortalActionButton,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  portalInputClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import {
  createAdminEmployee,
} from '../../services/adminEmployeesApi';
import {
  getDepartments,
  type DepartmentResponse,
} from '../../services/departmentsApi';
import {
  ApiError,
} from '../../services/httpClient';
import {
  getWorkLocations,
  type WorkLocationResponse,
} from '../../services/workLocationsApi';

interface EmployeeFormState {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  departmentId: string;
  workLocationId: string;
}

const EMPTY_FORM: EmployeeFormState = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  departmentId: '',
  workLocationId: '',
};

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your login session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to create employees.';
    }

    if (error.errors) {
      const validationMessages =
        Object.values(error.errors).flat();

      if (validationMessages.length > 0) {
        return validationMessages.join(' ');
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to save the employee.';
}

export default function AdminEmployeeForm() {
  const navigate = useNavigate();

  const { employeeNumber } =
    useParams<{
      employeeNumber?: string;
    }>();

  const { accessToken } = useSession();

  const isEditMode =
    Boolean(employeeNumber);

  const [form, setForm] =
    useState<EmployeeFormState>(
      EMPTY_FORM,
    );

  const [
    departments,
    setDepartments,
  ] = useState<DepartmentResponse[]>([]);

  const [
    workLocations,
    setWorkLocations,
  ] = useState<WorkLocationResponse[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const activeDepartments =
    useMemo(
      () =>
        departments.filter(
          (department) =>
            department.isActive,
        ),
      [departments],
    );

  const activeWorkLocations =
    useMemo(
      () =>
        workLocations.filter(
          (location) =>
            location.isActive,
        ),
      [workLocations],
    );

  useEffect(() => {
    async function loadOptions() {
      if (!accessToken) {
        setError(
          'No authenticated session was found. Please log in again.',
        );

        setIsLoading(false);
        return;
      }

      try {
        const [
          departmentResponse,
          locationResponse,
        ] = await Promise.all([
          getDepartments(accessToken),
          getWorkLocations(accessToken),
        ]);

        const enabledDepartments =
          departmentResponse.filter(
            (department) =>
              department.isActive,
          );

        const enabledLocations =
          locationResponse.filter(
            (location) =>
              location.isActive,
          );

        setDepartments(
          departmentResponse,
        );

        setWorkLocations(
          locationResponse,
        );

        setForm((current) => ({
          ...current,

          departmentId:
            current.departmentId ||
            enabledDepartments[0]?.id ||
            '',

          workLocationId:
            current.workLocationId ||
            enabledLocations[0]?.id ||
            '',
        }));
      } catch (caught) {
        setError(
          getErrorMessage(caught),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOptions();
  }, [accessToken]);

  function updateField(
    field: keyof EmployeeFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
  }

  if (isEditMode) {
    return (
      <div className="mx-auto max-w-4xl">
        <PortalPageHeader
          title="Edit employee"
          description="Employee editing has not yet been added to the backend API."
        />

        <PortalNotice tone="error">
          This route previously updated only
          the frontend demo repository. It
          has been disabled to prevent
          displaying a successful update
          that was never saved to
          PostgreSQL.
        </PortalNotice>

        <div className="mt-5">
          <PortalActionButton
            tone="secondary"
            onClick={() =>
              navigate('/admin/employees')
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to employees
          </PortalActionButton>
        </div>
      </div>
    );
  }

  const cannotCreate =
    isLoading ||
    isSaving ||
    activeDepartments.length === 0 ||
    activeWorkLocations.length === 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PortalPageHeader
        title="Add employee"
        description="Create a live employee record in the Railway PostgreSQL database."
      />

      {error ? (
        <PortalNotice tone="error">
          {error}
        </PortalNotice>
      ) : null}

      {!isLoading &&
      activeDepartments.length === 0 ? (
        <PortalNotice tone="error">
          No active departments are
          available. Create or activate a
          department before adding an
          employee.
        </PortalNotice>
      ) : null}

      {!isLoading &&
      activeWorkLocations.length === 0 ? (
        <PortalNotice tone="error">
          No active work locations are
          available. A work location must
          be created before adding an
          employee.
        </PortalNotice>
      ) : null}

      <PortalPanel className="mt-6 p-5 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-dark-grey">
            Loading departments and work
            locations…
          </p>
        ) : (
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);

              if (!accessToken) {
                setError(
                  'Your login session is unavailable. Please log in again.',
                );

                return;
              }

              if (
                !form.employeeNumber.trim() ||
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.departmentId ||
                !form.workLocationId
              ) {
                setError(
                  'Complete all required fields.',
                );

                return;
              }

              setIsSaving(true);

              try {
                await createAdminEmployee(
                  {
                    employeeNumber:
                      form.employeeNumber,

                    firstName:
                      form.firstName,

                    lastName:
                      form.lastName,

                    email:
                      form.email.trim() ||
                      null,

                    phoneNumber:
                      form.phoneNumber.trim() ||
                      null,

                    departmentId:
                      form.departmentId,

                    workLocationId:
                      form.workLocationId,
                  },
                  accessToken,
                );

                navigate(
                  '/admin/employees',
                  {
                    replace: true,
                  },
                );
              } catch (caught) {
                setError(
                  getErrorMessage(caught),
                );
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <PortalField label="Employee number">
              <input
                required
                maxLength={50}
                value={form.employeeNumber}
                onChange={(event) =>
                  updateField(
                    'employeeNumber',
                    event.target.value
                      .toUpperCase(),
                  )
                }
                className={portalInputClass}
                placeholder="e.g. EMP001"
              />
            </PortalField>

            <PortalField label="Department">
              <select
                required
                value={form.departmentId}
                onChange={(event) =>
                  updateField(
                    'departmentId',
                    event.target.value,
                  )
                }
                className={portalInputClass}
                disabled={
                  activeDepartments.length ===
                  0
                }
              >
                <option value="">
                  Select department
                </option>

                {activeDepartments.map(
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
            </PortalField>

            <PortalField label="First name">
              <input
                required
                value={form.firstName}
                onChange={(event) =>
                  updateField(
                    'firstName',
                    event.target.value,
                  )
                }
                className={portalInputClass}
              />
            </PortalField>

            <PortalField label="Last name">
              <input
                required
                value={form.lastName}
                onChange={(event) =>
                  updateField(
                    'lastName',
                    event.target.value,
                  )
                }
                className={portalInputClass}
              />
            </PortalField>

            <PortalField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField(
                    'email',
                    event.target.value,
                  )
                }
                className={portalInputClass}
                placeholder="Optional"
              />
            </PortalField>

            <PortalField label="Phone number">
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(event) =>
                  updateField(
                    'phoneNumber',
                    event.target.value,
                  )
                }
                className={portalInputClass}
                placeholder="Optional"
              />
            </PortalField>

            <PortalField label="Work location">
              <select
                required
                value={form.workLocationId}
                onChange={(event) =>
                  updateField(
                    'workLocationId',
                    event.target.value,
                  )
                }
                className={portalInputClass}
                disabled={
                  activeWorkLocations.length ===
                  0
                }
              >
                <option value="">
                  Select work location
                </option>

                {activeWorkLocations.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name}
                    </option>
                  ),
                )}
              </select>
            </PortalField>

            <div className="flex flex-wrap gap-3 md:col-span-2 md:justify-end">
              <PortalActionButton
                type="button"
                tone="secondary"
                onClick={() =>
                  navigate(
                    '/admin/employees',
                  )
                }
              >
                Cancel
              </PortalActionButton>

              <PortalActionButton
                type="submit"
                disabled={cannotCreate}
              >
                <Save className="h-4 w-4" />

                {isSaving
                  ? 'Saving…'
                  : 'Save employee'}
              </PortalActionButton>
            </div>
          </form>
        )}
      </PortalPanel>
    </div>
  );
}