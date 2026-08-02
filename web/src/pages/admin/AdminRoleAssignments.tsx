import {
  RefreshCw,
  Save,
  ShieldCheck,
  UserPlus,
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
  createUserAccount,
  getAdminEmployees,
  getAllUserAccounts,
  getAvailableUserRoles,
  updateUserRoles,
  type AdminEmployeeResponse,
  type UserAccountResponse,
} from '../../services/adminEmployeesApi';
import { ApiError } from '../../services/httpClient';

interface AccountFormState {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_ACCOUNT_FORM: AccountFormState = {
  email: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

const ROLE_LABELS: Record<string, string> = {
  Employee: 'Employee',
  Supervisor: 'Supervisor',
  HROfficer: 'HR Officer',
  PayrollOfficer: 'Payroll Officer',
  SystemAdministrator:
    'System Administrator',
  ExecutiveViewer: 'Executive Viewer',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your login session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to manage these accounts or roles.';
    }

    if (
      error.identityErrors &&
      error.identityErrors.length > 0
    ) {
      return error.identityErrors
        .map((item) => item.description)
        .join(' ');
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

  return 'The request could not be completed.';
}

function toggleRole(
  currentRoles: string[],
  role: string,
  checked: boolean,
): string[] {
  if (checked) {
    return currentRoles.includes(role)
      ? currentRoles
      : [...currentRoles, role];
  }

  return currentRoles.filter(
    (currentRole) => currentRole !== role,
  );
}

export default function AdminRoleAssignments() {
  const {
    accessToken,
    userId: currentUserId,
  } = useSession();

  const [employees, setEmployees] = useState<
    AdminEmployeeResponse[]
  >([]);

  const [accounts, setAccounts] = useState<
    UserAccountResponse[]
  >([]);

  const [
    availableRoles,
    setAvailableRoles,
  ] = useState<string[]>([]);

  const [
    selectedEmployeeId,
    setSelectedEmployeeId,
  ] = useState('');

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState('');

  const [accountForm, setAccountForm] =
    useState<AccountFormState>(
      EMPTY_ACCOUNT_FORM,
    );

  const [createRoles, setCreateRoles] =
    useState<string[]>(['Employee']);

  const [editedRoles, setEditedRoles] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isCreating, setIsCreating] =
    useState(false);

  const [isSavingRoles, setIsSavingRoles] =
    useState(false);

  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const loadData = useCallback(async () => {
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
        employeeResponse,
        accountResponse,
        roleResponse,
      ] = await Promise.all([
        getAdminEmployees(accessToken),
        getAllUserAccounts(accessToken),
        getAvailableUserRoles(accessToken),
      ]);

      setEmployees(employeeResponse);
      setAccounts(accountResponse);
      setAvailableRoles(roleResponse);

      const linkedEmployeeIds = new Set(
        accountResponse
          .map((account) => account.employeeId)
          .filter(
            (
              employeeId,
            ): employeeId is string =>
              Boolean(employeeId),
          ),
      );

      const firstUnlinkedEmployee =
        employeeResponse.find(
          (employee) =>
            employee.isActive &&
            !linkedEmployeeIds.has(
              employee.id,
            ),
        );

      setSelectedEmployeeId((current) => {
        const currentStillAvailable =
          employeeResponse.some(
            (employee) =>
              employee.id === current &&
              employee.isActive &&
              !linkedEmployeeIds.has(
                employee.id,
              ),
          );

        return currentStillAvailable
          ? current
          : firstUnlinkedEmployee?.id ?? '';
      });

      setSelectedAccountId((current) => {
        const currentExists =
          accountResponse.some(
            (account) =>
              account.id === current,
          );

        return currentExists
          ? current
          : accountResponse[0]?.id ?? '';
      });
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
    void loadData();
  }, [loadData]);

  const linkedEmployeeIds = useMemo(
    () =>
      new Set(
        accounts
          .map((account) => account.employeeId)
          .filter(
            (
              employeeId,
            ): employeeId is string =>
              Boolean(employeeId),
          ),
      ),
    [accounts],
  );

  const unlinkedEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.isActive &&
          !linkedEmployeeIds.has(
            employee.id,
          ),
      ),
    [employees, linkedEmployeeIds],
  );

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) =>
          employee.id ===
          selectedEmployeeId,
      ) ?? null,
    [employees, selectedEmployeeId],
  );

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.id ===
          selectedAccountId,
      ) ?? null,
    [accounts, selectedAccountId],
  );

  useEffect(() => {
    if (!selectedEmployee) {
      setAccountForm(EMPTY_ACCOUNT_FORM);
      return;
    }

    setAccountForm({
      email: selectedEmployee.email ?? '',
      firstName:
        selectedEmployee.firstName,
      lastName:
        selectedEmployee.lastName,
      phoneNumber:
        selectedEmployee.phoneNumber ?? '',
      password: '',
      confirmPassword: '',
    });

    setCreateRoles(['Employee']);
  }, [selectedEmployee]);

  useEffect(() => {
    setEditedRoles(
      selectedAccount
        ? [...selectedAccount.roles]
        : [],
    );
  }, [selectedAccount]);

  const privilegedAccountCount =
    accounts.filter((account) =>
      account.roles.some(
        (role) => role !== 'Employee',
      ),
    ).length;

  const isEditingOwnAccount =
    selectedAccount?.id === currentUserId;

  async function handleCreateAccount() {
    if (!accessToken) {
      setMessage({
        text: 'Your authenticated session is unavailable.',
        error: true,
      });

      return;
    }

    if (!selectedEmployee) {
      setMessage({
        text: 'Select an employee who does not yet have a login account.',
        error: true,
      });

      return;
    }

    if (
      !accountForm.email.trim() ||
      !accountForm.firstName.trim() ||
      !accountForm.lastName.trim() ||
      !accountForm.password
    ) {
      setMessage({
        text: 'Complete all required account fields.',
        error: true,
      });

      return;
    }

    if (
      accountForm.password !==
      accountForm.confirmPassword
    ) {
      setMessage({
        text: 'The password confirmation does not match.',
        error: true,
      });

      return;
    }

    if (createRoles.length === 0) {
      setMessage({
        text: 'Select at least one role.',
        error: true,
      });

      return;
    }

    setIsCreating(true);
    setMessage(null);

    try {
      await createUserAccount(
        {
          email: accountForm.email,
          password: accountForm.password,
          firstName:
            accountForm.firstName,
          lastName:
            accountForm.lastName,
          phoneNumber:
            accountForm.phoneNumber.trim() ||
            null,
          employeeId:
            selectedEmployee.id,
          roles: createRoles,
        },
        accessToken,
      );

      setAccountForm(
        EMPTY_ACCOUNT_FORM,
      );

      setMessage({
        text: `Login account created for ${selectedEmployee.fullName}.`,
        error: false,
      });

      await loadData();
    } catch (error) {
      setMessage({
        text: getErrorMessage(error),
        error: true,
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveRoles() {
    if (
      !accessToken ||
      !selectedAccount
    ) {
      setMessage({
        text: 'Select a login account.',
        error: true,
      });

      return;
    }

    if (editedRoles.length === 0) {
      setMessage({
        text: 'A login account must have at least one role.',
        error: true,
      });

      return;
    }

    setIsSavingRoles(true);
    setMessage(null);

    try {
      const updatedAccount =
        await updateUserRoles(
          selectedAccount.id,
          editedRoles,
          accessToken,
        );

      setAccounts((current) =>
        current.map((account) =>
          account.id ===
          updatedAccount.id
            ? updatedAccount
            : account,
        ),
      );

      setMessage({
        text: 'Account roles updated successfully.',
        error: false,
      });
    } catch (error) {
      setMessage({
        text: getErrorMessage(error),
        error: true,
      });
    } finally {
      setIsSavingRoles(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Accounts and roles"
        description="Create employee login accounts and manage live roles stored by ASP.NET Core Identity."
        actions={
          <PortalActionButton
            tone="secondary"
            disabled={isLoading}
            onClick={() => {
              setMessage(null);
              void loadData();
            }}
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
          label="Login accounts"
          value={
            isLoading
              ? '—'
              : accounts.length
          }
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Linked employees"
          value={
            isLoading
              ? '—'
              : linkedEmployeeIds.size
          }
          icon={
            <UserPlus className="h-5 w-5" />
          }
          tone="green"
        />

        <MetricCard
          label="Awaiting accounts"
          value={
            isLoading
              ? '—'
              : unlinkedEmployees.length
          }
          icon={
            <UsersRound className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Privileged accounts"
          value={
            isLoading
              ? '—'
              : privilegedAccountCount
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PortalPanel className="p-5 sm:p-6">
          <h2 className="font-bold">
            Create employee login
          </h2>

          <p className="mt-2 text-xs leading-5 text-dark-grey">
            Link one login account to an
            employee record and assign its
            initial roles.
          </p>

          {isLoading ? (
            <p className="mt-5 text-sm text-dark-grey">
              Loading employees and
              accounts…
            </p>
          ) : unlinkedEmployees.length ===
            0 ? (
            <PortalNotice>
              Every active employee already
              has a linked login account.
            </PortalNotice>
          ) : (
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateAccount();
              }}
            >
              <PortalField label="Employee">
                <select
                  required
                  value={
                    selectedEmployeeId
                  }
                  onChange={(event) =>
                    setSelectedEmployeeId(
                      event.target.value,
                    )
                  }
                  className={
                    portalInputClass
                  }
                >
                  {unlinkedEmployees.map(
                    (employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.fullName} ·{' '}
                        {
                          employee.employeeNumber
                        }
                      </option>
                    ),
                  )}
                </select>
              </PortalField>

              <PortalField label="Login email">
                <input
                  required
                  type="email"
                  value={accountForm.email}
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        email:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                />
              </PortalField>

              <PortalField label="First name">
                <input
                  required
                  value={
                    accountForm.firstName
                  }
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        firstName:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                />
              </PortalField>

              <PortalField label="Last name">
                <input
                  required
                  value={
                    accountForm.lastName
                  }
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        lastName:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                />
              </PortalField>

              <PortalField label="Phone number">
                <input
                  type="tel"
                  value={
                    accountForm.phoneNumber
                  }
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        phoneNumber:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                  placeholder="Optional"
                />
              </PortalField>

              <div />

              <PortalField label="Initial password">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={
                    accountForm.password
                  }
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        password:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                />
              </PortalField>

              <PortalField label="Confirm password">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={
                    accountForm
                      .confirmPassword
                  }
                  onChange={(event) =>
                    setAccountForm(
                      (current) => ({
                        ...current,
                        confirmPassword:
                          event.target.value,
                      }),
                    )
                  }
                  className={
                    portalInputClass
                  }
                />
              </PortalField>

              <fieldset className="sm:col-span-2">
                <legend className="mb-3 text-sm font-semibold">
                  Initial roles
                </legend>

                <div className="grid gap-3 sm:grid-cols-2">
                  {availableRoles.map(
                    (availableRole) => (
                      <label
                        key={availableRole}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-card border border-light-grey px-4"
                      >
                        <input
                          type="checkbox"
                          checked={createRoles.includes(
                            availableRole,
                          )}
                          onChange={(
                            event,
                          ) =>
                            setCreateRoles(
                              (current) =>
                                toggleRole(
                                  current,
                                  availableRole,
                                  event.target
                                    .checked,
                                ),
                            )
                          }
                        />

                        <span className="text-sm">
                          {getRoleLabel(
                            availableRole,
                          )}
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </fieldset>

              <PortalActionButton
                type="submit"
                disabled={isCreating}
                className="sm:col-span-2"
              >
                <UserPlus className="h-4 w-4" />

                {isCreating
                  ? 'Creating account…'
                  : 'Create login account'}
              </PortalActionButton>
            </form>
          )}
        </PortalPanel>

        <PortalPanel className="p-5 sm:p-6">
          <h2 className="font-bold">
            Update account roles
          </h2>

          <p className="mt-2 text-xs leading-5 text-dark-grey">
            Replace the selected account’s
            current role assignments.
          </p>

          {accounts.length === 0 ? (
            <PortalNotice>
              No login accounts are
              available.
            </PortalNotice>
          ) : (
            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveRoles();
              }}
            >
              <PortalField label="Account">
                <select
                  value={
                    selectedAccountId
                  }
                  onChange={(event) =>
                    setSelectedAccountId(
                      event.target.value,
                    )
                  }
                  className={
                    portalInputClass
                  }
                >
                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.firstName}{' '}
                        {account.lastName} ·{' '}
                        {account.email}
                      </option>
                    ),
                  )}
                </select>
              </PortalField>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  Assigned roles
                </legend>

                <div className="grid gap-3 sm:grid-cols-2">
                  {availableRoles.map(
                    (availableRole) => {
                      const protectsOwnAdminRole =
                        isEditingOwnAccount &&
                        availableRole ===
                          'SystemAdministrator';

                      return (
                        <label
                          key={availableRole}
                          className="flex min-h-11 items-center gap-3 rounded-card border border-light-grey px-4"
                        >
                          <input
                            type="checkbox"
                            checked={editedRoles.includes(
                              availableRole,
                            )}
                            disabled={
                              protectsOwnAdminRole
                            }
                            onChange={(
                              event,
                            ) =>
                              setEditedRoles(
                                (current) =>
                                  toggleRole(
                                    current,
                                    availableRole,
                                    event.target
                                      .checked,
                                  ),
                              )
                            }
                          />

                          <span className="text-sm">
                            {getRoleLabel(
                              availableRole,
                            )}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>

              {isEditingOwnAccount ? (
                <p className="text-xs leading-5 text-dark-grey">
                  Your own System
                  Administrator role cannot
                  be removed.
                </p>
              ) : null}

              <PortalActionButton
                type="submit"
                disabled={
                  isSavingRoles ||
                  !selectedAccount
                }
                className="w-full"
              >
                <Save className="h-4 w-4" />

                {isSavingRoles
                  ? 'Saving roles…'
                  : 'Save roles'}
              </PortalActionButton>
            </form>
          )}
        </PortalPanel>
      </div>

      <PortalNotice>
        Supervisor-to-team-member
        relationships are not shown here
        because the current backend does not
        yet expose a persistent team
        assignment endpoint.
      </PortalNotice>

      <PortalPanel className="mt-6">
        <div className="border-b border-light-grey px-5 py-4">
          <h2 className="font-bold">
            Login accounts
          </h2>
        </div>

        {isLoading ? (
          <PortalEmptyState>
            Loading login accounts…
          </PortalEmptyState>
        ) : accounts.length === 0 ? (
          <PortalEmptyState>
            No login accounts have been
            created.
          </PortalEmptyState>
        ) : (
          <PortalTable>
            <thead>
              <tr>
                <th className={portalThClass}>
                  Account
                </th>

                <th className={portalThClass}>
                  Employee
                </th>

                <th className={portalThClass}>
                  Roles
                </th>

                <th className={portalThClass}>
                  Status
                </th>

                <th className={portalThClass}>
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td
                    className={portalTdClass}
                  >
                    <p className="font-semibold">
                      {account.firstName}{' '}
                      {account.lastName}
                    </p>

                    <p className="mt-1 text-xs text-dark-grey">
                      {account.email}
                    </p>
                  </td>

                  <td
                    className={portalTdClass}
                  >
                    {account.employeeName ??
                      'Not linked'}

                    {account.employeeNumber ? (
                      <p className="mt-1 text-xs text-dark-grey">
                        {
                          account.employeeNumber
                        }
                      </p>
                    ) : null}
                  </td>

                  <td
                    className={portalTdClass}
                  >
                    {account.roles
                      .map(getRoleLabel)
                      .join(', ')}
                  </td>

                  <td
                    className={portalTdClass}
                  >
                    <PortalStatus
                      value={
                        account.isLockedOut
                          ? 'Locked'
                          : account.isActive
                            ? 'Active'
                            : 'Inactive'
                      }
                    />
                  </td>

                  <td
                    className={portalTdClass}
                  >
                    {new Date(
                      account.createdAtUtc,
                    ).toLocaleDateString(
                      'en-ZA',
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}