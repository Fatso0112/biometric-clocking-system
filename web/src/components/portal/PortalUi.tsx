import type { ReactNode } from 'react';

export const portalInputClass =
  'h-11 w-full rounded-card border border-light-grey bg-white px-4 text-sm text-black outline-none placeholder:text-dark-grey/70 focus:border-black focus:ring-1 focus:ring-black';
export const portalThClass =
  'whitespace-nowrap border-b border-light-grey bg-cream-white/70 px-5 py-3 text-xs font-semibold text-black';
export const portalTdClass = 'border-b border-light-grey px-5 py-4 align-middle';

export function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-dark-grey">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function PortalActionButton({
  children,
  tone = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'primary' | 'secondary' | 'danger';
}) {
  const toneClass = {
    primary: 'border-black bg-black text-white hover:opacity-90',
    secondary: 'border-light-grey bg-white text-black hover:bg-light-grey/60',
    danger: 'border-status-red bg-white text-status-red hover:bg-status-red-soft',
  }[tone];
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-card border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

export function MetricCard({
  label,
  value,
  icon,
  tone = 'plain',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: 'plain' | 'green' | 'amber' | 'red';
}) {
  const toneClass = {
    plain: 'text-black',
    green: 'text-status-green',
    amber: 'text-status-amber',
    red: 'text-status-red',
  }[tone];
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-card border border-light-grey bg-white p-5 shadow-item">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-white ${toneClass}`}>
        {icon}
      </span>
      <div>
        <p className="text-sm text-dark-grey">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}

export function PortalPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`rounded-card border border-light-grey bg-white shadow-item ${className}`}>{children}</section>;
}

export function PortalTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm">{children}</table></div>;
}

export function PortalStatus({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized === 'active' || normalized === 'present' || normalized === 'paid' || normalized === 'verified'
      ? 'border-status-green/30 bg-status-green-soft text-status-green'
      : normalized === 'inactive' || normalized === 'absent' || normalized === 'failed'
        ? 'border-status-red/30 bg-status-red-soft text-status-red'
        : normalized === 'late' || normalized === 'approved'
          ? 'border-status-amber/30 bg-status-amber-soft text-status-amber'
          : 'border-light-grey bg-cream-white text-dark-grey';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{value.replace('-', ' ')}</span>;
}

export function PortalField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-dark-grey">{label}</span>
      {children}
    </label>
  );
}

export function PortalEmptyState({ children }: { children: ReactNode }) {
  return <div className="px-6 py-14 text-center text-sm text-dark-grey">{children}</div>;
}

export function PortalNotice({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: 'success' | 'error';
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mt-4 rounded-card border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-status-red/30 bg-status-red-soft text-status-red'
          : 'border-status-green/30 bg-status-green-soft text-status-green'
      }`}
    >
      {children}
    </div>
  );
}
