interface CircularChartProps {
  percentage: number;
  label: string;
  color: 'blue' | 'emerald' | 'orange' | 'purple';
}

const colorConfig = {
  blue: { circle: '#3b82f6', bg: '#dbeafe' },
  emerald: { circle: '#059669', bg: '#d1fae5' },
  orange: { circle: '#d97706', bg: '#fef3c7' },
  purple: { circle: '#a855f7', bg: '#f3e8ff' },
};

export default function CircularChart({
  percentage,
  label,
  color = 'blue',
}: CircularChartProps) {
  const config = colorConfig[color];
  const circumference = 2 * Math.PI * 68;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        <svg
          width="192"
          height="192"
          className="transform -rotate-90"
          viewBox="0 0 192 192"
        >
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="68"
            fill="none"
            stroke={config.bg}
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r="68"
            fill="none"
            stroke={config.circle}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-6 text-center">
        {label}
      </p>
    </div>
  );
}
