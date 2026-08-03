import {
  CircleHelp,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { getNotRegisteredScanType } from '../types/navigation';

export default function NotRegistered() {
  const location = useLocation();
  const scanType = getNotRegisteredScanType(location.state);

  return (
    <AppShell>
      <ScreenHeader title="Biometric Not Enrolled" backTo="/clock" />
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <ClipboardList
              className="h-[72px] w-[72px] text-black"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="absolute bottom-2 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
              <CircleHelp
                className="h-6 w-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>
          </div>
          <h1 className="mt-3 text-lg font-semibold">
            No active {scanType} enrolment
          </h1>
          <p className="mt-2 max-w-[320px] text-sm leading-[1.6] text-dark-grey">
            Your account is linked to an employee record, but the backend does not have an active biometric enrolment for attendance verification.
          </p>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="text-lg font-semibold">What happens next</h2>
          <p className="mt-2 text-sm leading-6 text-dark-grey">
            Ask a system administrator to open the Employees page and create an authorised mock face enrolment for MVP testing. Production enrolment must use the organisation’s approved biometric provider.
          </p>
        </Card>

        <NoticeBanner
          className="mt-4"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />}
        >
          Employees cannot approve or create their own biometric enrolments.
        </NoticeBanner>
      </div>
    </AppShell>
  );
}
