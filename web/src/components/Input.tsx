import type { InputHTMLAttributes, ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  trailingAction?: ReactNode;
};

export default function Input({ label, icon, trailingAction, id, className = '', ...props }: InputProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-xs font-semibold text-black">{label}</span>
      <span className="flex h-[52px] items-center gap-3 rounded-card bg-light-grey px-4 ring-1 ring-transparent focus-within:ring-black/20">
        <span className="shrink-0 text-black" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          className={`min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-black outline-none placeholder:text-dark-grey/70 ${className}`}
          {...props}
        />
        {trailingAction ? <span className="shrink-0">{trailingAction}</span> : null}
      </span>
    </label>
  );
}
