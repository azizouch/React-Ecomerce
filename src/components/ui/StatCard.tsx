import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const colorConfig = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950', icon: 'text-blue-600 dark:text-blue-400', accent: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-600 dark:border-l-blue-400' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950', icon: 'text-emerald-600 dark:text-emerald-400', accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-600 dark:border-l-emerald-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', accent: 'text-purple-600 dark:text-purple-400', border: 'border-l-purple-600 dark:border-l-purple-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950', icon: 'text-orange-600 dark:text-orange-400', accent: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-600 dark:border-l-orange-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950', icon: 'text-red-600 dark:text-red-400', accent: 'text-red-600 dark:text-red-400', border: 'border-l-red-600 dark:border-l-red-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950', icon: 'text-indigo-600 dark:text-indigo-400', accent: 'text-indigo-600 dark:text-indigo-400', border: 'border-l-indigo-600 dark:border-l-indigo-400' },
};

export default function StatCard({
  title,
  value,
  subtext,
  icon,
  iconColor = 'blue',
  trend,
  trendValue,
}: StatCardProps) {
  const colors = colorConfig[iconColor];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 border-l-4 ${colors.border} hover:border-gray-300 dark:hover:border-slate-600 transition-all shadow-md hover:shadow-lg `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-semibold ${colors.accent}`}>{value}</p>
        </div>
        {icon && (
          <div className={`flex-shrink-0 w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>
      
      {(subtext || trendValue) && (
        <div className="flex items-center space-x-2">
          {trendValue && (
            <span
              className={`text-xs font-medium ${
                trend === 'up'
                  ? 'text-emerald-600'
                  : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {trendValue}
            </span>
          )}
          {subtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
          )}
        </div>
      )}
    </div>
  );
}
