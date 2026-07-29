import { Eye, EyeOff, LockKeyhole, User, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { useSession } from '../context/SessionContext';

export default function Login() {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <AppShell className="justify-center">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black">
          <Users className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="text-base font-bold tracking-[0.02em]">HR ATTENDANCE</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-dark-grey">MANAGEMENT SYSTEM</p>
      </div>

      <Card>
        <div className="text-center">
          <h1 className="text-2xl font-bold leading-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-dark-grey">Please login to your account</p>
        </div>

        <form
          className="mt-7 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const staffNumberInput = event.currentTarget.elements.namedItem('staff-number');
            const staffNumber = staffNumberInput instanceof HTMLInputElement ? staffNumberInput.value.trim() : '';
            startSession(staffNumber || '10001');
            navigate('/clock');
          }}
        >
          <Input
            id="staff-number"
            label="Staff Number"
            icon={<User className="h-5 w-5" strokeWidth={1.5} />}
            placeholder="Enter staff number"
            autoComplete="off"
          />
          <Input
            id="password"
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
            <button type="button" className="text-dark-grey hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
              Forgot password?
            </button>
          </div>

          <Button type="submit" className="mt-1">LOGIN</Button>
        </form>
      </Card>
    </AppShell>
  );
}
