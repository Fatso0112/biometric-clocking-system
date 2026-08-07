import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrClockRedirect, LegacyEmployeeEditRedirect } from './components/LegacyPortalRedirects';
import PortalFeatureRoute from './components/PortalFeatureRoute';
import ProtectedRoute from './components/ProtectedRoute';
import SessionInvalidationRedirect from './components/SessionInvalidationRedirect';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceRegister from './pages/AttendanceRegister';
import AttendanceSummary from './pages/AttendanceSummary';
import ClockInOut from './pages/ClockInOut';
import ConfirmationScreen from './pages/ConfirmationScreen';
import Dashboard from './pages/Dashboard';
import DeviceBiometric from './pages/DeviceBiometric';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import LocationCheck from './pages/LocationCheck';
import NotRegistered from './pages/NotRegistered';
import Profile from './pages/Profile';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorEmployeeDetails from './pages/SupervisorEmployeeDetails';
import SupervisorReports from './pages/SupervisorReports';
import SupervisorTeamAttendance from './pages/SupervisorTeamAttendance';
import UpdateBiometrics from './pages/UpdateBiometrics';

const PortalShell = lazy(() => import('./components/PortalShell'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'));
const AdminEmployees = lazy(() => import('./pages/admin/AdminEmployees'));
const AdminEmployeeForm = lazy(() => import('./pages/admin/AdminEmployeeForm'));
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'));
const AdminWorkLocations = lazy(() => import('./pages/admin/AdminWorkLocations'));
const AdminRoleAssignments = lazy(() => import('./pages/admin/AdminRoleAssignments'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const HrAttendance = lazy(() => import('./pages/hr/HrAttendance'));
const PortalReports = lazy(() => import('./pages/portal/PortalReports'));
const PortalProfile = lazy(() => import('./pages/portal/PortalProfile'));
const PayrollRuns = lazy(() => import('./pages/payroll/PayrollRuns'));
const PayrollRunDetails = lazy(() => import('./pages/payroll/PayrollRunDetails'));

function PortalLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-white px-4 text-sm text-dark-grey">
      Loading portal…
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SessionInvalidationRedirect />}>
        <Route path="/" element={<Login />} />
        <Route path="/admin/login" element={<Navigate to="/" replace />} />
        <Route path="/hr/login" element={<Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<ProtectedRoute requiredRole="employee" />}>
          <Route path="/clock" element={<ClockInOut />} />
          <Route path="/location-check" element={<LocationCheck />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan/device" element={<DeviceBiometric />} />
          <Route path="/clock-in-confirmation" element={<ConfirmationScreen variant="clockIn" />} />
          <Route path="/break-start-confirmation" element={<ConfirmationScreen variant="breakStart" />} />
          <Route path="/break-end-confirmation" element={<ConfirmationScreen variant="breakEnd" />} />
          <Route path="/clock-out-confirmation" element={<ConfirmationScreen variant="clockOut" />} />
          <Route path="/not-registered" element={<NotRegistered />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance-register" element={<AttendanceRegister />} />
          <Route path="/attendance-history" element={<AttendanceHistory />} />
          <Route path="/attendance-summary" element={<AttendanceSummary />} />
          <Route path="/update-biometrics" element={<UpdateBiometrics />} />
        </Route>
        <Route path="/supervisor" element={<ProtectedRoute requiredRole="supervisor" />}>
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="team-attendance" element={<SupervisorTeamAttendance />} />
          <Route
            path="team-attendance/:employeeId"
            element={<SupervisorEmployeeDetails />}
          />
          <Route path="reports" element={<SupervisorReports />} />
        </Route>
        <Route element={<PortalFeatureRoute />}>
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="register" element={<Navigate to="/admin/employees/new" replace />} />
            <Route path="manage" element={<Navigate to="/admin/employees" replace />} />
            <Route path="deactivate" element={<Navigate to="/admin/employees" replace />} />
            <Route path="hr-officers" element={<Navigate to="/admin/role-assignments?role=hr" replace />} />
            <Route path="supervisors" element={<Navigate to="/admin/role-assignments?role=supervisor" replace />} />
            <Route path="register-hr-officer" element={<Navigate to="/admin/role-assignments?role=hr" replace />} />
            <Route path="employees/edit/:id" element={<LegacyEmployeeEditRedirect />} />
            <Route
              element={(
                <Suspense fallback={<PortalLoading />}>
                  <PortalShell role="admin" />
                </Suspense>
              )}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={(
                  <Suspense fallback={<PortalLoading />}>
                    <PortalDashboard role="admin" />
                  </Suspense>
                )}
              />
              <Route path="employees" element={<Suspense fallback={<PortalLoading />}><AdminEmployees /></Suspense>} />
              <Route path="employees/new" element={<Suspense fallback={<PortalLoading />}><AdminEmployeeForm /></Suspense>} />
              <Route path="employees/:employeeNumber" element={<Suspense fallback={<PortalLoading />}><AdminEmployeeForm /></Suspense>} />
              <Route path="departments" element={<Suspense fallback={<PortalLoading />}><AdminDepartments /></Suspense>} />
              <Route path="work-locations" element={<Suspense fallback={<PortalLoading />}><AdminWorkLocations /></Suspense>} />
              <Route path="role-assignments" element={<Suspense fallback={<PortalLoading />}><AdminRoleAssignments /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PortalLoading />}><PortalReports role="admin" /></Suspense>} />
              <Route path="payroll" element={<Suspense fallback={<PortalLoading />}><PayrollRuns role="admin" /></Suspense>} />
              <Route path="payroll/:id" element={<Suspense fallback={<PortalLoading />}><PayrollRunDetails role="admin" /></Suspense>} />
              <Route path="audit-logs" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="users" element={<Suspense fallback={<PortalLoading />}><AdminUsers /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PortalLoading />}><PortalProfile role="admin" /></Suspense>} />
            </Route>
          </Route>
          <Route path="/hr" element={<ProtectedRoute requiredRole="hr" />}>
            <Route path="clock-in" element={<HrClockRedirect />} />
            <Route path="clock-out" element={<HrClockRedirect />} />
            <Route path="reports/daily" element={<Navigate to="/hr/reports?period=daily" replace />} />
            <Route path="reports/weekly" element={<Navigate to="/hr/reports?period=weekly" replace />} />
            <Route path="reports/monthly" element={<Navigate to="/hr/reports?period=monthly" replace />} />
            <Route path="reports/employee" element={<Navigate to="/hr/reports?group=employee" replace />} />
            <Route
              element={(
                <Suspense fallback={<PortalLoading />}>
                  <PortalShell role="hr" />
                </Suspense>
              )}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={(
                  <Suspense fallback={<PortalLoading />}>
                    <PortalDashboard role="hr" />
                  </Suspense>
                )}
              />
              <Route path="attendance" element={<Suspense fallback={<PortalLoading />}><HrAttendance /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PortalLoading />}><PortalReports role="hr" /></Suspense>} />
              <Route path="payroll" element={<Suspense fallback={<PortalLoading />}><PayrollRuns role="hr" /></Suspense>} />
              <Route path="payroll/:id" element={<Suspense fallback={<PortalLoading />}><PayrollRunDetails role="hr" /></Suspense>} />
              <Route path="settings" element={<Navigate to="/hr/dashboard" replace />} />
              <Route path="profile" element={<Suspense fallback={<PortalLoading />}><PortalProfile role="hr" /></Suspense>} />
            </Route>
          </Route>
          <Route path="/payroll" element={<ProtectedRoute requiredRole="payroll" />}>
            <Route
              element={(
                <Suspense fallback={<PortalLoading />}>
                  <PortalShell role="payroll" />
                </Suspense>
              )}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Suspense fallback={<PortalLoading />}><PayrollRuns role="payroll" /></Suspense>} />
              <Route path="runs/:id" element={<Suspense fallback={<PortalLoading />}><PayrollRunDetails role="payroll" /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PortalLoading />}><PortalProfile role="payroll" /></Suspense>} />
            </Route>
          </Route>
          <Route path="/executive" element={<ProtectedRoute requiredRole="executive" />}>
            <Route
              element={(
                <Suspense fallback={<PortalLoading />}>
                  <PortalShell role="executive" />
                </Suspense>
              )}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Suspense fallback={<PortalLoading />}><PayrollRuns role="executive" /></Suspense>} />
              <Route path="payroll/:id" element={<Suspense fallback={<PortalLoading />}><PayrollRunDetails role="executive" /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PortalLoading />}><PortalProfile role="executive" /></Suspense>} />
            </Route>
          </Route>
        </Route>01
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}