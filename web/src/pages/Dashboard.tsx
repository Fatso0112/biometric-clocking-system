import { Fingerprint, ScanFace } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import EmployeeHeader from '../components/EmployeeHeader';
import ListItem from '../components/ListItem';
import { useSession } from '../context/SessionContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { staffNumber } = useSession();

  return (
    <AppShell>
      <EmployeeHeader staffNumber={staffNumber!} profileFrom="/dashboard" />

      <Card className="mt-3 p-5">
        <h2 className="text-lg font-semibold">Authentication Method</h2>
        <p className="mt-1 text-sm text-dark-grey">Choose your preferred login method</p>
        <div className="mt-6 space-y-4">
          <ListItem
            icon={<Fingerprint className="h-8 w-8" strokeWidth={1.5} />}
            title="Fingerprint"
            subtitle="Login with your registered fingerprint"
            onClick={() => navigate('/scan/fingerprint')}
          />
          <ListItem
            icon={<ScanFace className="h-8 w-8" strokeWidth={1.5} />}
            title="Face Recognition"
            subtitle="Login with your registered face"
            onClick={() => navigate('/scan/face')}
          />
        </div>
      </Card>
    </AppShell>
  );
}
