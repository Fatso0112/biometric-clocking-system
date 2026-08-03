import { Fingerprint, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import { useSession } from '../context/SessionContext';
import { getClockingFlowNavigationState } from '../types/navigation';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { staffNumber } = useSession();
  const clockingFlow = getClockingFlowNavigationState(location.state);

  useEffect(() => {
    if (!clockingFlow) {
      navigate('/clock', { replace: true });
    }
  }, [clockingFlow, navigate]);

  if (!clockingFlow) return null;

  return (
    <AppShell>
      <EmployeeHeader staffNumber={staffNumber ?? '—'} profileFrom="/clock" />
      <Card className="mt-3 p-5">
        <h2 className="text-lg font-semibold">Device verification</h2>
        <p className="mt-1 text-sm text-dark-grey">Verify your identity before submitting this attendance action.</p>
        <div className="mt-6 space-y-4">
          <ListItem
            icon={<Fingerprint className="h-8 w-8" strokeWidth={1.5} />}
            title="Verify with this device"
            subtitle="Use the phone's face, fingerprint, PIN, or secure platform authenticator"
            onClick={() => navigate('/scan/device', { state: { mode: 'verify' as const, ...clockingFlow } })}
          />
          <NoticeBanner className="mt-1" icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}>
            A fresh WebAuthn verification is required for every Clock In, break, and Clock Out action. The application never receives a fingerprint image or facial template.
          </NoticeBanner>
        </div>
      </Card>
    </AppShell>
  );
}
