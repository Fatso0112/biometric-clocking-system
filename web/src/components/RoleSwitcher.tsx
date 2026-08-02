import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { getRoleHomePath } from '../types/navigation';
import type { UserRole } from '../types/session';

const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hr: 'HR',
  admin: 'Admin',
};

type RoleSwitcherProps = {
  compact?: boolean;
};

export default function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const navigate = useNavigate();
  const { activeRole, authorizedRoles, setActiveRole } = useSession();
  if (!activeRole || authorizedRoles.length < 2) return null;

  return (
    <label className="block">
      <span className={compact ? 'sr-only' : 'mb-2 block text-xs font-semibold text-dark-grey'}>
        Active portal
      </span>
      <select
        aria-label="Switch active portal"
        value={activeRole}
        onChange={(event) => {
          const role = event.target.value as UserRole;
          if (!authorizedRoles.includes(role)) return;
          setActiveRole(role);
          navigate(getRoleHomePath(role), { replace: true });
        }}
        className={
          compact
            ? 'h-10 max-w-[92px] rounded-card border border-light-grey bg-white px-2 text-[11px] font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black'
            : 'h-11 w-full rounded-card border border-light-grey bg-white px-3 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
        }
      >
        {authorizedRoles.map((role) => (
          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
        ))}
      </select>
    </label>
  );
}
