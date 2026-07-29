import { LogOut, User } from 'lucide-react';

type EmployeeHeaderProps = {
  staffNumber: string;
  onLogout: () => void;
};

export default function EmployeeHeader({ staffNumber, onLogout }: EmployeeHeaderProps) {
  return (
    <header className="flex items-start gap-3 py-5">
      <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border border-light-grey bg-white">
        <User className="h-9 w-9 text-black" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-dark-grey">Welcome,</p>
        <h1 className="text-lg font-semibold leading-tight">Employee</h1>
        <span className="mt-2 inline-flex rounded-full bg-light-grey px-3 py-1 text-[11px] text-black">
          Staff No: {staffNumber}
        </span>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex h-11 w-11 items-center justify-center rounded-full text-black hover:bg-light-grey/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
        aria-label="Log out"
      >
        <LogOut className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </header>
  );
}
