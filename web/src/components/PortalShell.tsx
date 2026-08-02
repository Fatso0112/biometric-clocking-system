import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle,
  UserCog,
  Users,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { ADMIN_HR_PORTALS_ENABLED } from '../config/featureFlags';
import { useSession } from '../context/SessionContext';
import { useLogout } from '../hooks/useLogout';
import {
  getPortalNavigationItems,
  type PortalNavigationIcon,
  type PortalNavigationItem,
  type PortalRole,
} from '../navigation/portalNavigation';
import RoleSwitcher from './RoleSwitcher';

type PortalShellProps = {
  role: PortalRole;
};

const PORTAL_LABELS: Record<PortalRole, string> = {
  admin: 'Admin Portal',
  hr: 'HR Portal',
};

const NAVIGATION_ICONS: Record<PortalNavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  employees: UsersRound,
  departments: Building2,
  roles: ShieldCheck,
  attendance: CalendarClock,
  reports: FileBarChart,
  payroll: WalletCards,
  users: UserCog,
  audit: ClipboardList,
  settings: Settings,
  profile: UserCircle,
};

function PortalNavLink({ item }: { item: PortalNavigationItem }) {
  const Icon = NAVIGATION_ICONS[item.icon];
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex min-h-11 shrink-0 items-center gap-3 rounded-card px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
          isActive ? 'bg-black text-white' : 'text-black hover:bg-light-grey'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

export default function PortalShell({ role }: PortalShellProps) {
  const logout = useLogout();
  const { employeeNumber } = useSession();
  const navigationItems = getPortalNavigationItems(role, ADMIN_HR_PORTALS_ENABLED);
  const PortalIcon = role === 'admin' ? ShieldCheck : Users;

  return (
    <main className="min-h-dvh bg-cream-white text-black">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1440px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className="hidden border-r border-light-grey bg-white p-5 lg:flex lg:flex-col"
          aria-label={`${PORTAL_LABELS[role]} navigation`}
        >
          <div className="flex items-center gap-3 px-1 pt-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-card bg-black text-white">
              <PortalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold">HR Attendance</p>
              <p className="mt-1 text-xs text-dark-grey">{PORTAL_LABELS[role]}</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1 overflow-y-auto pb-4">
            {navigationItems.map((item) => <PortalNavLink key={item.path} item={item} />)}
          </nav>

          <div className="mt-auto space-y-3 border-t border-light-grey pt-5">
            <RoleSwitcher />
            <p className="truncate px-1 text-xs text-dark-grey">Employee No. {employeeNumber}</p>
            <button
              type="button"
              onClick={() => logout()}
              className="flex min-h-11 w-full items-center gap-3 rounded-card px-4 py-3 text-sm font-semibold hover:bg-light-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              Log out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-light-grey bg-white px-4 py-4 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-black text-white">
                  <PortalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold">HR Attendance</p>
                  <p className="truncate text-xs text-dark-grey">{PORTAL_LABELS[role]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleSwitcher compact />
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-light-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label={`${PORTAL_LABELS[role]} navigation`}>
              {navigationItems.map((item) => <PortalNavLink key={item.path} item={item} />)}
            </nav>
          </header>

          <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10">
            <Outlet />
          </section>
        </div>
      </div>
    </main>
  );
}
