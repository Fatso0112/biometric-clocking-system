import { Fingerprint, ScanFace } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import ListItem from '../components/ListItem';
import ScreenHeader from '../components/ScreenHeader';
import { getProfileOrigin } from '../types/navigation';

export default function UpdateBiometrics() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileFrom = getProfileOrigin(location.state);

  return (
    <AppShell>
      <ScreenHeader title="Update Biometrics" backTo="/profile" backState={{ from: profileFrom }} />

      <Card className="mt-6 p-5">
        <h2 className="text-lg font-semibold">Update Biometrics</h2>
        <p className="mt-1 text-sm text-dark-grey">Choose which biometric to update</p>
        <div className="mt-6 space-y-4">
          <ListItem
            icon={<Fingerprint className="h-8 w-8" strokeWidth={1.5} />}
            title="Fingerprint"
            subtitle="Update your registered fingerprint"
            onClick={() =>
              navigate('/scan/fingerprint', {
                state: { mode: 'enroll', enrollmentSource: 'profile', from: profileFrom },
              })
            }
          />
          <ListItem
            icon={<ScanFace className="h-8 w-8" strokeWidth={1.5} />}
            title="Face Recognition"
            subtitle="Update your registered face"
            onClick={() =>
              navigate('/scan/face', {
                state: { mode: 'enroll', enrollmentSource: 'profile', from: profileFrom },
              })
            }
          />
        </div>
      </Card>
    </AppShell>
  );
}
