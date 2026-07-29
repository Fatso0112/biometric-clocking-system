import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type ListItemProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
};

export default function ListItem({ icon, title, subtitle, onClick }: ListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-item transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-y-0"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-cream-white text-black" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-black">{title}</span>
        <span className="mt-1 block text-[12px] leading-[1.55] text-dark-grey">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-black" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
