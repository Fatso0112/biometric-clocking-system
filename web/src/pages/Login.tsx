import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import NoticeBanner from '../components/NoticeBanner';
import { useSession } from '../context/SessionContext';
import { authenticate } from '../services/authApi';
import { getRoleHomePath, type LoginNavigationState } from '../types/navigation';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession } = useSession();
  const routeMessage = (location.state as LoginNavigationState | null)?.noticeMessage ?? null;
  const [noticeMessage] = useState(routeMessage);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (routeMessage) navigate('/', { replace: true, state: null });
  }, [navigate, routeMessage]);

  return (
    <AppShell className="justify-center">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black">
          <Users className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="text-base font-bold tracking-[0.02em]">HR ATTENDANCE</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-dark-grey">MANAGEMENT SYSTEM</p>
      </div>

      {noticeMessage ? (
        <NoticeBanner
          className="mb-4"
          icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />}
        >
          {noticeMessage}
        </NoticeBanner>
      ) : null}

      {authenticationError ? (
        <NoticeBanner
          className="mb-4"
          role="alert"
          icon={<AlertCircle className="h-5 w-5" strokeWidth={1.5} />}
        >
          {authenticationError}
        </NoticeBanner>
      ) : null}

      <Card>
        <div className="text-center">
          <h1 className="text-2xl font-bold leading-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-dark-grey">Please login to your account</p>
        </div>

        <form
          className="mt-7 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const staffNumberInput = event.currentTarget.elements.namedItem('staff-number');
            const passwordInput = event.currentTarget.elements.namedItem('password');
            const staffNumber = staffNumberInput instanceof HTMLInputElement ? staffNumberInput.value.trim() : '';
            const password = passwordInput instanceof HTMLInputElement ? passwordInput.value : '';

            setAuthenticationError(null);
            setIsAuthenticating(true);

            try {
              const response = await authenticate({ staffNumber, password });
              if (response.status !== 'authenticated') {
                setAuthenticationError(response.message);
                return;
              }

              startSession(response.identity, rememberMe);
              navigate(getRoleHomePath(response.identity.activeRole));
            } finally {
              setIsAuthenticating(false);
            }
          }}
        >
          <Input
            id="staff-number"
            name="staff-number"
            label="Staff Number"
            icon={<User className="h-5 w-5" strokeWidth={1.5} />}
            placeholder="Enter staff number"
            autoComplete="off"
          />
          <Input
            id="password"
            name="password"
            label="Password"
            icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.5} />}
            placeholder="Enter password"
            autoComplete="off"
            type={showPassword ? 'text' : 'password'}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                )}
              </button>
            }
          />

          <div className="flex items-center justify-between gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-black">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 appearance-none rounded-[3px] border border-dark-grey bg-white checked:border-black checked:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-dark-grey hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="mt-1 disabled:cursor-not-allowed disabled:bg-light-grey disabled:text-dark-grey disabled:shadow-none"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'AUTHENTICATING…' : 'LOGIN'}
          </Button>
        </form>

        <div className="mt-6 border-t border-light-grey pt-5 text-xs text-dark-grey">
          <p className="font-semibold text-black">Frontend demo accounts</p>
          <p className="mt-2 leading-5">
            Employee 10001 · Supervisor 20001 · HR 30001 · Admin 40001
          </p>
          <p className="mt-1">
            Password: <span className="font-semibold text-black">demo123</span>
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
