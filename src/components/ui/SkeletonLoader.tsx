interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  className?: string;
}

export default function SkeletonLoader({
  count = 4,
  height = 'h-20',
  className = '',
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-100 rounded-xl animate-pulse border border-gray-200`}
        />
      ))}
    </div>
  );
}
