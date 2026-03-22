interface SkeletonProps { lines?: number; height?: string; className?: string; }

export function Skeleton({ lines = 1, height = 'h-4', className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${height} rounded-lg animate-shimmer`}
          style={i === lines - 1 && lines > 1 ? { width: '60%' } : undefined} />
      ))}
    </div>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="card p-4">
      {/* Route line skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[10px] h-[10px] rounded-full animate-shimmer" />
        <div className="h-3 w-14 rounded-md animate-shimmer" />
        <div className="flex-1 h-[2px] animate-shimmer" />
        <div className="w-[10px] h-[10px] rounded-full animate-shimmer" />
        <div className="h-3 w-14 rounded-md animate-shimmer" />
      </div>
      {/* Avatar + name */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full animate-shimmer" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-20 rounded-md animate-shimmer" />
            <div className="h-2.5 w-16 rounded-md animate-shimmer" />
          </div>
        </div>
        <div className="h-6 w-12 rounded-md animate-shimmer" />
      </div>
      {/* Tags */}
      <div className="flex gap-2">
        <div className="h-[22px] w-28 rounded-lg animate-shimmer" />
        <div className="h-[22px] w-16 rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}
