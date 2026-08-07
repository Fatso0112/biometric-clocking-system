import type { UserRole } from '../types/session';

export type PortalRole = Extract<
  UserRole,
  'admin' | 'hr' | 'payroll' | 'executive'
>;

export type PortalNavigationIcon =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'locations'
  | 'roles'
  | 'attendance'
  | 'reports'
  | 'payroll'
  | 'users'
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
    { label: 'Work Locations', path: '/admin/work-locations', icon: 'locations' },
    { label: 'Role Assignments', path: '/admin/role-assignments', icon: 'roles' },
    { label: 'Reports', path: '/admin/reports', icon: 'reports' },
    { label: 'Payroll', path: '/admin/payroll', icon: 'payroll' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
    { label: 'Profile', path: '/admin/profile', icon: 'profile' },
  ],
  hr: [
    { label: 'Dashboard', path: '/hr/dashboard', icon: 'dashboard' },
    { label: 'Attendance', path: '/hr/attendance', icon: 'attendance' },
    { label: 'Reports', path: '/hr/reports', icon: 'reports' },
    { label: 'Payroll', path: '/hr/payroll', icon: 'payroll' },
    { label: 'Profile', path: '/hr/profile', icon: 'profile' },
  ],
  payroll: [
    { label: 'Payroll', path: '/payroll/dashboard', icon: 'payroll' },
    { label: 'Profile', path: '/payroll/profile', icon: 'profile' },
  ],
  executive: [
    { label: 'Payroll', path: '/executive/dashboard', icon: 'payroll' },
    { label: 'Profile', path: '/executive/profile', icon: 'profile' },
  ],
};

export function getPortalNavigationItems(
  role: PortalRole,
  portalsEnabled: boolean,
): readonly PortalNavigationItem[] {
  return portalsEnabled ? PORTAL_NAVIGATION[role] : [];
}