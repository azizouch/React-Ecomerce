import { ReactNode } from 'react';

interface SoftCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function SoftCard({
  children,
  className = '',
  hoverable = false,
}: SoftCardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm ${
        hoverable ? 'hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600 transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
