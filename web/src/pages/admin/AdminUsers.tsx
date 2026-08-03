import { RefreshCw, Search, UserCog, UserX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  getAllUserAccounts,
  updateUserAccountStatus,
  type UserAccountResponse,
} from '../../services/adminEmployeesApi';
import { ApiError } from '../../services/httpClient';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'User accounts could not be loaded.';
}

export default function AdminUsers() {
  const { accessToken, userId } = useSession();
  const [users, setUsers] = useState<UserAccountResponse[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage(null);
    try {
      setUsers(await getAllUserAccounts(accessToken));
    } catch (error) {
      setMessage({ text: getErrorMessage(error), error: true });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const normalizedQuery = query.toLowerCase().trim();
  const filteredUsers = useMemo(
    () => users.filter((user) =>
      !normalizedQuery ||
      `${user.email} ${user.firstName} ${user.lastName} ${user.employeeNumber ?? ''}`
        .toLowerCase()
        .includes(normalizedQuery),
    ),
    [normalizedQuery, users],
  );

  async function toggleStatus(user: UserAccountResponse) {
    if (!accessToken || user.id === userId) return;
    const nextStatus = !user.isActive;
    if (!window.confirm(`${nextStatus ? 'Enable' : 'Disable'} login access for ${user.firstName} ${user.lastName}?`)) return;

    setUpdatingId(user.id);
    setMessage(null);
    try {
      const updated = await updateUserAccountStatus(user.id, nextStatus, accessToken);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage({ text: 'User account updated successfully.', error: false });
    } catch (error) {
      setMessage({ text: getErrorMessage(error), error: true });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Users"
        description="Manage user accounts and roles stored by ASP.NET Core Identity."
        actions={<PortalActionButton tone="secondary" onClick={() => void loadUsers()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</PortalActionButton>}
      />
      {message ? <PortalNotice tone={message.error ? 'error' : 'success'}>{message.text}</PortalNotice> : null}
      <MetricGrid>
        <MetricCard label="User accounts" value={loading ? '—' : users.length} icon={<UserCog className="h-5 w-5" />} />
        <MetricCard label="Active" value={loading ? '—' : users.filter((user) => user.isActive).length} icon={<UserCog className="h-5 w-5" />} tone="green" />
        <MetricCard label="Inactive" value={loading ? '—' : users.filter((user) => !user.isActive).length} icon={<UserX className="h-5 w-5" />} tone="red" />
      </MetricGrid>
      <PortalPanel className="mt-6">
        <div className="border-b border-light-grey p-4">
          <label className="relative block max-w-lg">
            <span className="sr-only">Search users</span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-grey" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${portalInputClass} pl-11`} placeholder="Search users" />
          </label>
        </div>
        {filteredUsers.length === 0 ? (
          <PortalEmptyState>{loading ? 'Loading user accounts…' : 'No user accounts match this search.'}</PortalEmptyState>
        ) : (
          <PortalTable>
            <thead><tr><th className={portalThClass}>User</th><th className={portalThClass}>Employee No.</th><th className={portalThClass}>Roles</th><th className={portalThClass}>Status</th><th className={portalThClass}>Action</th></tr></thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className={portalTdClass}><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="mt-1 text-xs text-dark-grey">{user.email}</p></td>
                  <td className={portalTdClass}>{user.employeeNumber ?? 'Not linked'}</td>
                  <td className={portalTdClass}>{user.roles.join(', ') || 'None'}</td>
                  <td className={portalTdClass}><PortalStatus value={user.isLockedOut ? 'Locked' : user.isActive ? 'Active' : 'Inactive'} /></td>
                  <td className={portalTdClass}><PortalActionButton disabled={user.id === userId || updatingId === user.id} tone={user.isActive ? 'danger' : 'secondary'} className="min-h-9 px-3 text-xs" onClick={() => void toggleStatus(user)}>{updatingId === user.id ? 'Saving…' : user.isActive ? 'Disable' : 'Enable'}</PortalActionButton></td>
                </tr>
              ))}
            </tbody>
          </PortalTable>
        )}
      </PortalPanel>
    </div>
  );
}
