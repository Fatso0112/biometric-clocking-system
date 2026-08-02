import type { ReactNode } from 'react';

type NoticeBannerProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
};

export default function NoticeBanner({ icon, children, className = '', role = 'status' }: NoticeBannerProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card bg-light-grey/70 px-4 py-3 text-xs leading-[1.5] text-dark-grey ${className}`}
      role={role}
      aria-live="polite"
    >
      <span className="shrink-0 text-black" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}
