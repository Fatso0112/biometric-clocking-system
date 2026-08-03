import {
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <ScreenHeader title="Password Help" backTo="/" />
      <div className="flex flex-1 items-center py-6">
        <Card className="w-full text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-light-grey text-black">
            <ShieldCheck
              className="h-10 w-10"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold leading-tight">
            Contact an administrator
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-dark-grey">
            Self-service password reset is not enabled in this MVP. An authorised administrator must restore your account access.
          </p>

          <NoticeBanner
            className="mt-6 text-left"
            role="status"
            icon={
              <AlertCircle
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            }
          >
            Do not share your existing password. The administrator should issue a temporary password through the approved account-management process.
          </NoticeBanner>

          <Button
            className="mt-7 inline-flex items-center justify-center gap-2"
            onClick={() => navigate('/', { replace: true })}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            BACK TO LOGIN
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
