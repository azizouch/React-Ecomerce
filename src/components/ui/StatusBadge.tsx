interface StatusBadgeProps {
  status: string;
  label?: string;
}

const statusConfig: {
  [key: string]: {
    bg: string;
    text: string;
    label: string;
  };
} = {
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Completed',
  },
  processing: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Processing',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Pending',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Cancelled',
  },
  active: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Active',
  },
  inactive: {
    bg: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-gray-300',
    label: 'Inactive',
  },
  warning: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'Warning',
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {label || config.label}
    </span>
  );
}
