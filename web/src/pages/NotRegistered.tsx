import {
  Fingerprint,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';

export default function NotRegistered() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <ScreenHeader
        title="Device Verification Not Enrolled"
        backTo="/clock"
      />

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-light-grey">
            <Smartphone
              className="h-12 w-12 text-black"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-4 text-lg font-semibold">
            Register this phone first
          </h1>

          <p className="mt-2 max-w-[340px] text-sm leading-[1.6] text-dark-grey">
            Attendance actions require a registered device
            credential. Your phone will use its configured
            face, fingerprint, or secure device verification
            to unlock that credential.
          </p>
        </div>

        <Card className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <Fingerprint
              className="mt-0.5 h-6 w-6 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />

            <div>
              <h2 className="text-lg font-semibold">
                One-time device registration
              </h2>

              <p className="mt-2 text-sm leading-6 text-dark-grey">
                Registering creates a public-key credential
                for this website. The private key and your
                biometric template remain protected by the
                phone and are not uploaded to the attendance
                system.
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="mt-5"
            onClick={() =>
              navigate('/update-biometrics', {
                state: { from: '/clock' },
              })
            }
          >
            REGISTER THIS DEVICE
          </Button>
        </Card>

        <NoticeBanner
          className="mt-4"
          icon={
            <ShieldCheck
              className="h-5 w-5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
        >
          A fresh device verification is required before
          every clock-in, break action, and clock-out.
        </NoticeBanner>
      </div>
    </AppShell>
  );
}
