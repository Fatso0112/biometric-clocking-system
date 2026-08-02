import { CircleHelp, ClipboardList, Clock3, Fingerprint, ScanFace } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { getNotRegisteredScanType } from '../types/navigation';

export default function NotRegistered() {
  const navigate = useNavigate();
  const location = useLocation();
  const scanType = getNotRegisteredScanType(location.state);
  const scanPath = scanType === 'fingerprint' ? '/scan/fingerprint' : '/scan/face';

  return (
    <AppShell>
      <ScreenHeader title="Not in Database" backTo={scanPath} backState={{ mode: 'verify' }} />
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <ClipboardList className="h-[72px] w-[72px] text-black" strokeWidth={1.5} aria-hidden="true" />
            <span className="absolute bottom-2 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
              <CircleHelp className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
          </div>
          <h1 className="mt-3 text-lg font-semibold">You are not registered</h1>
          <p className="mt-2 max-w-[300px] text-sm leading-[1.6] text-dark-grey">
            It looks like your information is not in our database.
          </p>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="text-lg font-semibold">Request Registration</h2>
          <p className="mt-1 text-sm leading-[1.55] text-dark-grey">
            Choose a method to capture and send your information to the admin.
          </p>
          <div className="mt-5 space-y-3">
            <ListItem
              icon={<ScanFace className="h-8 w-8" strokeWidth={1.5} />}
              title="Enter Face"
              subtitle="Capture your face and send to admin"
              onClick={() =>
                navigate('/scan/face', {
                  state: { mode: 'enroll', enrollmentSource: 'registration' },
                })
              }
            />
            <ListItem
              icon={<Fingerprint className="h-8 w-8" strokeWidth={1.5} />}
              title="Enter Fingerprint"
              subtitle="Capture your fingerprint and send to admin"
              onClick={() =>
                navigate('/scan/fingerprint', {
                  state: { mode: 'enroll', enrollmentSource: 'registration' },
                })
              }
            />
          </div>
        </Card>

        <NoticeBanner className="mt-4" icon={<Clock3 className="h-5 w-5" strokeWidth={1.5} />}>
          Your request will be reviewed by the admin.
        </NoticeBanner>
      </div>
    </AppShell>
  );
}
