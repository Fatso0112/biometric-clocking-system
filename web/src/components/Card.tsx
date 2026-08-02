import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-card bg-white p-6 shadow-card ${className}`}>{children}</div>
  );
}
