import { AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { requestPasswordReset } from '../services/passwordResetApi';

type RequestStatus = 'idle' | 'sending' | 'sent';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [staffNumber, setStaffNumber] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;

    setStatus('sending');
    setErrorMessage(null);

    try {
      const result = await requestPasswordReset(staffNumber);

      if (result.status === 'sent') {
        setMaskedEmail(result.maskedEmail);
        setStatus('sent');
        return;
      }

      setErrorMessage(
        result.status === 'not_found'
          ? "We couldn't find an account with that staff number."
          : 'Something went wrong. Please try again.',
      );
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    }

    setStatus('idle');
  };

  return (
    <AppShell>
      <ScreenHeader title="Forgot Password" backTo="/" />
      <div className="flex flex-1 items-center py-6">
        <Card className="w-full">
          {status === 'sent' ? (
            <div className="text-center" aria-live="polite">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-status-green-soft text-status-green">
                <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h2 className="mt-6 text-2xl font-bold leading-tight">Check Your Email</h2>
              <p className="mt-3 text-sm leading-relaxed text-dark-grey">
                We've sent a password reset link to {maskedEmail}
              </p>
              <Button className="mt-7" onClick={() => navigate('/', { replace: true })}>
                BACK TO LOGIN
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold leading-tight">Forgot Password</h2>
                <p className="mt-2 text-sm leading-relaxed text-dark-grey">
                  Enter your staff number and we'll send you a reset link.
                </p>
              </div>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <Input
                  id="reset-staff-number"
                  label="Staff Number"
                  icon={<User className="h-5 w-5" strokeWidth={1.5} />}
                  placeholder="Enter staff number"
                  autoComplete="username"
                  value={staffNumber}
                  onChange={(event) => setStaffNumber(event.target.value)}
                  required
                />

                {errorMessage ? (
                  <NoticeBanner
                    icon={<AlertCircle className="h-5 w-5" strokeWidth={1.5} />}
                    role="alert"
                  >
                    {errorMessage}
                  </NoticeBanner>
                ) : null}

                <Button
                  type="submit"
                  disabled={status === 'sending'}
                  aria-busy={status === 'sending'}
                  className="disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none disabled:hover:opacity-100"
                >
                  {status === 'sending' ? 'Sending…' : 'SEND RESET LINK'}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
