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
      className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-md]
        ${hoverable ? 'hover:shadow-lg hover:border-gray-200 dark:hover:border-slate-600 transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
