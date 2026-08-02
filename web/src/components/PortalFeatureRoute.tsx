import { Navigate, Outlet } from 'react-router-dom';
import { ADMIN_HR_PORTALS_ENABLED } from '../config/featureFlags';

export default function PortalFeatureRoute() {
  return ADMIN_HR_PORTALS_ENABLED ? <Outlet /> : <Navigate to="/" replace />;
}
