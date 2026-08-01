import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type ListItemProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  compactOnDesktop?: boolean;
};

export default function ListItem({ icon, title, subtitle, onClick, compactOnDesktop = false }: ListItemProps) {
  const compactButtonClasses = compactOnDesktop ? 'sm:gap-2 sm:p-1.5' : '';
  const compactIconClasses = compactOnDesktop ? 'sm:h-9 sm:w-9' : '';
  const compactTitleClasses = compactOnDesktop ? 'sm:text-xs' : '';
  const compactSubtitleClasses = compactOnDesktop ? 'sm:mt-0.5 sm:text-[10px] sm:leading-[1.35]' : '';
  const compactChevronClasses = compactOnDesktop ? 'sm:h-4 sm:w-4' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-item transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-y-0 ${compactButtonClasses}`}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-cream-white text-black ${compactIconClasses}`} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold text-black ${compactTitleClasses}`}>{title}</span>
        <span className={`mt-1 block text-[12px] leading-[1.55] text-dark-grey ${compactSubtitleClasses}`}>{subtitle}</span>
      </span>
      <ChevronRight className={`h-5 w-5 shrink-0 text-black ${compactChevronClasses}`} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
