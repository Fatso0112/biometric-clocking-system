import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export default function AppShell({ children, className = '' }: AppShellProps) {
  return (
    <main className="min-h-dvh bg-cream-white px-4 py-5 text-black sm:py-8">
      <section
        className={`mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[390px] flex-col sm:min-h-[780px] ${className}`}
      >
        {children}
      </section>
    </main>
  );
}
