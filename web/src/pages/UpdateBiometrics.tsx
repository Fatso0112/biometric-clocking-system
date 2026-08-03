import { ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { getProfileOrigin } from '../types/navigation';

export default function UpdateBiometrics() {
  const location = useLocation();
  const profileFrom = getProfileOrigin(location.state);

  return (
    <AppShell>
      <ScreenHeader
        title="Biometric Enrolment"
        backTo="/profile"
        backState={{ from: profileFrom }}
      />

      <Card className="mt-6 p-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-light-grey">
          <ShieldCheck className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 text-xl font-bold">Administrator-managed enrolment</h1>
        <p className="mt-3 text-sm leading-6 text-dark-grey">
          Employees cannot create or replace biometric enrolments from this MVP client. Contact HR or a system administrator.
        </p>
      </Card>

      <NoticeBanner
        className="mt-4"
        icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />}
      >
        The hosted MVP uses an explicitly labelled mock biometric provider. Real face or fingerprint enrolment requires an approved production provider and device process.
      </NoticeBanner>
    </AppShell>
  );
}
