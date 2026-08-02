import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { useLogout } from '../hooks/useLogout';
import type { ProfileOrigin } from '../types/navigation';
import RoleSwitcher from './RoleSwitcher';

type EmployeeHeaderProps = {
  staffNumber: string;
  profileFrom: ProfileOrigin;
};

export default function EmployeeHeader({ staffNumber, profileFrom }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const logout = useLogout();
  const { profile } = useEmployeeProfile();

  return (
    <header className="flex items-start gap-3 py-5">
      <button
        type="button"
        onClick={() => navigate('/profile', { state: { from: profileFrom } })}
        className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-light-grey bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        aria-label="Open profile"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`${profile.name} profile photo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-9 w-9 text-black" strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-dark-grey">Welcome,</p>
        <h1 className="text-lg font-semibold leading-tight">Employee</h1>
        <span className="mt-2 inline-flex rounded-full bg-light-grey px-3 py-1 text-[11px] text-black">
          Staff No: {staffNumber}
        </span>
      </div>
      <RoleSwitcher compact />
      <button
        type="button"
        onClick={() => logout()}
        className="flex h-11 w-11 items-center justify-center rounded-full text-black hover:bg-light-grey/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
        aria-label="Log out"
      >
        <LogOut className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </header>
  );
}
