import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export function LegacyEmployeeEditRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/admin/employees/${encodeURIComponent(id)}` : '/admin/employees'} replace />;
}

export function HrClockRedirect() {
  const navigate = useNavigate();
  const { authorizedRoles, setActiveRole } = useSession();

  useEffect(() => {
    if (!authorizedRoles.includes('employee')) {
      navigate('/hr/dashboard', { replace: true });
      return;
    }
    setActiveRole('employee');
    navigate('/clock', { replace: true });
  }, [authorizedRoles, navigate, setActiveRole]);

  return null;
}
