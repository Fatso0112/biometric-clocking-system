import type { UserRole } from '../types/session';

export type PortalRole = Extract<UserRole, 'admin' | 'hr'>;
export type PortalNavigationIcon =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'roles'
  | 'attendance'
  | 'reports'
  | 'payroll'
  | 'users'
  | 'audit'
  | 'settings'
  | 'profile';

export interface PortalNavigationItem {
  label: string;
  path: string;
  icon: PortalNavigationIcon;
}

const PORTAL_NAVIGATION: Record<PortalRole, readonly PortalNavigationItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Employees', path: '/admin/employees', icon: 'employees' },
    { label: 'Departments', path: '/admin/departments', icon: 'departments' },
    { label: 'Role Assignments', path: '/admin/role-assignments', icon: 'roles' },
    { label: 'Payroll', path: '/admin/payroll', icon: 'payroll' },
    { label: 'Reports', path: '/admin/reports', icon: 'reports' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'audit' },
    { label: 'Settings', path: '/admin/settings', icon: 'settings' },
    { label: 'Profile', path: '/admin/profile', icon: 'profile' },
  ],
  hr: [
    { label: 'Dashboard', path: '/hr/dashboard', icon: 'dashboard' },
    { label: 'Attendance', path: '/hr/attendance', icon: 'attendance' },
    { label: 'Reports', path: '/hr/reports', icon: 'reports' },
    { label: 'Payroll', path: '/hr/payroll', icon: 'payroll' },
    { label: 'Settings', path: '/hr/settings', icon: 'settings' },
    { label: 'Profile', path: '/hr/profile', icon: 'profile' },
  ],
};

export function getPortalNavigationItems(
  role: PortalRole,
  portalsEnabled: boolean,
): readonly PortalNavigationItem[] {
  return portalsEnabled ? PORTAL_NAVIGATION[role] : [];
}
