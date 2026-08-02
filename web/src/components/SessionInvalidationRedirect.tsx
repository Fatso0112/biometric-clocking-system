import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function SessionInvalidationRedirect() {
  const location = useLocation();
  const { acknowledgeReauthentication, requiresReauthentication } = useSession();

  useEffect(() => {
    if (requiresReauthentication && location.pathname === '/') {
      acknowledgeReauthentication();
    }
  }, [acknowledgeReauthentication, location.pathname, requiresReauthentication]);

  if (requiresReauthentication && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
